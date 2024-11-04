import { ChatMessage, MoveTarget } from "../../shared/types"
import { MovementController } from "../MovementController"
import { EmitInterface } from "../SocketManager"
import { BrainDump } from "../brain/AIBrain"
import { FunctionSchema, functionToSchema } from "../openai/aihelper"
import { continue_conversation, start_conversation } from "../prompts"
import { Action } from "./Action"
import { TalkAIResponse, createChatMessage, generateAssistantResponse } from "./generateMessage"
import { z } from "zod"

export const TIMEOUT_MESSAGE = "I haven't heard from you in a while. Feel free to chat again later!"
type BufferingState = {
  type: "buffering_messages"
  timeSinceLastMessage: number
  messages: ChatMessage[]
}

type RespondingState = {
  type: "responding"
  chunksToEmit: string[]
  emittedChunks: string[]
  timeSinceLastChunk: number
}

type AwaitingMessageState = {
  type: "awaiting_message"
  timeSinceLastMessage: number
}

type TalkActionState = BufferingState | RespondingState | AwaitingMessageState

export type ConversationType = { type: "existing"; message: ChatMessage } | { type: "new" }

export class TalkAction extends Action {
  private readonly MESSAGE_BUFFER_TIMEOUT = 3000
  private readonly CHUNK_DELAY = 1000
  private readonly CONVERSATION_TIMEOUT = 15000

  private state: TalkActionState = {
    type: "awaiting_message",
    timeSinceLastMessage: 0,
  }

  private tools: FunctionSchema[]
  private functionMap: { [functionName: string]: Function }

  constructor(
    getBrainDump: () => BrainDump,
    getEmitMethods: () => EmitInterface,
    reason: string = "",
    private targetPlayerUsername: string,
    private conversationType: ConversationType,
    private movementController: MovementController,
  ) {
    super(getBrainDump, getEmitMethods, reason)
    this.tools = [this.endConversationTool]
    this.functionMap = {
      endConversation: (args: { reason: string }) => this.endConversation(args.reason),
    }
  }

  getTargetPlayerUsername(): string {
    return this.targetPlayerUsername
  }

  private endConversationTool = functionToSchema(
    this.endConversation,
    z.object({ reason: z.string() }),
    "Use this function to decline or finish the conversation by giving a reason.",
  )

  private transitionToState(newState: TalkActionState) {
    if (this.isCompletedFlag) return
    this.state = newState
  }

  private splitIntoChunks(message: string): string[] {
    const chunks = message.match(/[^.!?]+[.!?]+/g) || [message]
    return chunks.filter((chunk) => chunk.length > 0)
  }

  private async generateResponse(): Promise<TalkAIResponse> {
    if (this.state.type !== "responding") {
      throw new Error("TalkAction is not in responding state, we should not be generating response")
    }

    const aiBrainSummary = this.getBrainDump().getStringifiedBrainDump()
    const system_message = continue_conversation(aiBrainSummary, this.targetPlayerUsername)

    const response = await generateAssistantResponse(
      system_message,
      this.getBrainDump()
        .getNewestActiveThread(this.targetPlayerUsername)
        .messages.map((item) => ({
          role: item.from === this.targetPlayerUsername ? "user" : "assistant",
          content: item.message,
        })),
      this.tools,
      this.functionMap,
    )
    return response
  }

  async handleMessage(chatMessage: ChatMessage) {
    if (this.isCompletedFlag) return

    this.getBrainDump().addChatMessage(chatMessage.from, chatMessage)

    switch (this.state.type) {
      case "awaiting_message":
        this.transitionToState({
          type: "buffering_messages",
          timeSinceLastMessage: 0,
          messages: [chatMessage],
        })
        break
      case "buffering_messages":
        this.state.messages.push(chatMessage)
        this.state.timeSinceLastMessage = 0
        break
      case "responding":
        this.transitionToState({
          type: "buffering_messages",
          timeSinceLastMessage: 0,
          messages: [chatMessage],
        })
        break
    }
  }

  private async processBufferedMessages() {
    const response = await this.generateResponse()
    if (!response) {
      this.transitionToState({
        type: "awaiting_message",
        timeSinceLastMessage: 0,
      })
      return
    }
    if (response.type === "endedConversation") {
      return
    }

    const chunks = this.splitIntoChunks(response.finalChatMessage)
    this.transitionToState({
      type: "responding",
      chunksToEmit: chunks,
      emittedChunks: [],
      timeSinceLastChunk: 0,
    })
  }

  private emitNextChunk() {
    if (this.state.type !== "responding") {
      throw new Error("TalkAction is not in responding state, we should not be emitting chunks")
    }

    const nextChunk = this.state.chunksToEmit.shift()
    if (!nextChunk) {
      this.transitionToState({
        type: "awaiting_message",
        timeSinceLastMessage: 0,
      })
      return
    }

    const chatMessage = createChatMessage(nextChunk, this.targetPlayerUsername, this.getBrainDump().playerData.username)

    const moveTarget: MoveTarget = { name: this.targetPlayerUsername, targetType: "person" }
    if (!this.movementController.ifMoveTargetReached(moveTarget)) {
      this.movementController.initiateMovement(moveTarget)
      this.movementController.resume()
    }

    this.getEmitMethods().emitSendMessage(chatMessage)
    this.getBrainDump().addChatMessage(this.targetPlayerUsername, chatMessage)
    this.state.emittedChunks.push(nextChunk)
  }

  endConversation(reason: string): string {
    if (this.isCompletedFlag) {
      throw new Error("TalkAction is completed, we should not be ending conversation")
    }
    this.isCompletedFlag = true

    if (!this.getBrainDump().getLatestThread(this.targetPlayerUsername).finished) {
      const finalMessage = createChatMessage(reason, this.targetPlayerUsername, this.getBrainDump().playerData.username)
      this.getBrainDump().addChatMessage(this.targetPlayerUsername, finalMessage)
      this.getBrainDump().closeThread(this.targetPlayerUsername)
      this.getEmitMethods().emitEndConversation(finalMessage)
    } else {
      throw new Error("TalkAction has a latest thread that is finished")
    }

    return reason
  }

  async start() {
    this.isStarted = true
    this.getBrainDump().getNewestActiveThread(this.targetPlayerUsername)

    if (this.conversationType.type === "new") {
      const aiBrainSummary = this.getBrainDump().getStringifiedBrainDump()
      const system_message = start_conversation(aiBrainSummary, this.targetPlayerUsername)

      const response = await generateAssistantResponse(
        system_message,
        this.getBrainDump().getNewestActiveThread(this.targetPlayerUsername).aiMessages,
      )
      if (response.type !== "endedConversation") {
        const chunks = this.splitIntoChunks(response.finalChatMessage)
        this.transitionToState({
          type: "responding",
          chunksToEmit: chunks,
          emittedChunks: [],
          timeSinceLastChunk: 0,
        })
      }
    } else {
      await this.handleMessage(this.conversationType.message)
    }
  }

  update(deltaTime: number) {
    if (this.isInterrupted || !this.isStarted || this.isCompletedFlag) return

    this.elapsedTime += deltaTime
    this.movementController.move(deltaTime)

    switch (this.state.type) {
      case "buffering_messages":
        this.state.timeSinceLastMessage += deltaTime
        if (this.state.timeSinceLastMessage >= this.MESSAGE_BUFFER_TIMEOUT) {
          this.processBufferedMessages().catch((error) => {
            console.error("Error processing buffered messages:", error)
            this.endConversation("I apologize, but I encountered an error. Let's chat again later!")
          })
        }
        break

      case "responding":
        this.state.timeSinceLastChunk += deltaTime
        if (this.state.timeSinceLastChunk >= this.CHUNK_DELAY) {
          this.emitNextChunk()
          this.state.timeSinceLastChunk = 0
        }
        break

      case "awaiting_message":
        this.state.timeSinceLastMessage += deltaTime
        if (this.state.timeSinceLastMessage >= this.CONVERSATION_TIMEOUT) {
          this.endConversation(TIMEOUT_MESSAGE)
        }
        break
    }
  }

  interrupt(): void {
    super.interrupt()
    this.shouldReflect = false
  }

  resume(): void {
    super.resume()
    this.shouldReflect = true
  }
}
