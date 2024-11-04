import { ChatMessage, MoveTarget } from "../../shared/types"
import { MovementController } from "../MovementController"
import { EmitInterface } from "../SocketManager"
import { BrainDump } from "../brain/AIBrain"
import { mapChatMessagesToAIMessages } from "../brain/memory/ConversationMemory"
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
  timeSinceLastMessage: number
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
    console.log("Transitioning to state", newState)
    if (this.isCompletedFlag) return
    this.state = newState
  }

  private splitIntoChunks(message: string): string[] {
    const chunks = message.match(/[^.!?]+[.!?]+/g) || [message]
    return chunks.filter((chunk) => chunk.length > 0)
  }

  private async generateResponse(): Promise<TalkAIResponse> {
    const aiBrainSummary = this.getBrainDump().getStringifiedBrainDump()
    const system_message = continue_conversation(aiBrainSummary, this.targetPlayerUsername)

    const response = await generateAssistantResponse(
      system_message,
      mapChatMessagesToAIMessages(
        this.getBrainDump().playerData.username,
        this.getBrainDump().getNewestActiveThread(this.targetPlayerUsername).messages,
      ),
      this.tools,
      this.functionMap,
    )
    return response
  }

  async handleMessage(chatMessage: ChatMessage) {
    if (this.isCompletedFlag) return

    console.log("In handle messageCurrent state is", this.state)

    this.getBrainDump().addChatMessage(chatMessage.from, chatMessage)
    switch (this.state.type) {
      case "awaiting_message":
      case "responding":
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
    }
  }

  private async processBufferedMessages() {
    if (this.state.type !== "buffering_messages") {
      throw new Error("TalkAction is not in buffering_messages state, we should not be processing buffered messages")
    }
    const old_messages_length = this.state.messages.length

    const response = await this.generateResponse()
    if (!response) {
      throw new Error("We couldn't generate response")
      return
    }
    if (response.type === "endedConversation") {
      return
    }

    if (this.state.type !== "buffering_messages") {
      console.log(this.state)
      throw new Error("After generating response, TalkAction is not in buffering_messages state anymore")
    }

    const new_messages_length = this.state.messages.length

    if (new_messages_length === old_messages_length) {
      const chunks = this.splitIntoChunks(response.finalChatMessage)
      this.transitionToState({
        type: "responding",
        chunksToEmit: chunks,
        emittedChunks: [],
        timeSinceLastMessage: 0,
      })
    } else {
      console.log("Messages have changed, recalling processBufferedMessages")
      this.processBufferedMessages()
    }
  }

  private emitNextChunk() {
    if (this.state.type !== "responding") {
      throw new Error("TalkAction is not in responding state, we should not be emitting chunks")
    }

    const nextChunk = this.state.chunksToEmit.shift()
    if (!nextChunk) {
      console.log("No next chunk to emit, transitioning to awaiting_message")
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

      if (this.getBrainDump().getNewestActiveThread(this.targetPlayerUsername).messages.length > 0) {
        throw new Error("Starting new talkAction but it has an active thread that is not empty")
      }
      const response = await generateAssistantResponse(system_message, [])
      if (response.type !== "endedConversation") {
        const chunks = this.splitIntoChunks(response.finalChatMessage)
        this.transitionToState({
          type: "responding",
          chunksToEmit: chunks,
          emittedChunks: [],
          timeSinceLastMessage: 0,
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

    this.state.timeSinceLastMessage += deltaTime

    switch (this.state.type) {
      case "buffering_messages":
        if (this.state.timeSinceLastMessage >= this.MESSAGE_BUFFER_TIMEOUT) {
          this.processBufferedMessages()
          this.state.timeSinceLastMessage = 0
        }
        break
      case "responding":
        if (this.state.timeSinceLastMessage >= this.CHUNK_DELAY) {
          this.emitNextChunk()
          this.state.timeSinceLastMessage = 0
        }
        break
      case "awaiting_message":
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
