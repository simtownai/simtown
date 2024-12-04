import logger from "../../shared/logger"
import { ChatMessage, MoveTarget } from "../../shared/types"
import { MovementController } from "../MovementController"
import { EmitInterface } from "../SocketManager"
import { BrainDump } from "../brain/AIBrain"
import { mapChatMessagesToAIMessages } from "../brain/memory/ConversationMemory"
import { log_threads } from "../loghelpers"
import { FunctionSchema, functionToSchema } from "../openai/aihelper"
import { PromptSystem } from "../prompts"
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

type ProcessingState = {
  type: "processing"
  messages: ChatMessage[]
}

type TalkActionState = BufferingState | RespondingState | AwaitingMessageState | ProcessingState

export type ConversationType = { type: "existing"; message: ChatMessage } | { type: "new"; message?: string }

export class TalkAction extends Action {
  private readonly MESSAGE_BUFFER_TIMEOUT = 3000
  private readonly CHUNK_DELAY = 1000
  private readonly CONVERSATION_TIMEOUT = 45000

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
    private promptSystem: PromptSystem,
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
    const aiBrainSummary = this.getBrainDump().getStringifiedBrainDump()
    const system_message = this.promptSystem.continueConversation(aiBrainSummary, this.targetPlayerUsername)

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
      case "processing":
        this.transitionToState({
          type: "buffering_messages",
          messages: [...this.state.messages, chatMessage],
          timeSinceLastMessage: 0,
        })
        break
    }
  }

  private async processBufferedMessages() {
    if (this.state.type !== "buffering_messages") {
      logger.error(
        `(${this.getBrainDump().playerData.username}) TalkAction is not in buffering_messages state, we should not be processing buffered messages`,
      )
      return
      // throw new Error("TalkAction is not in buffering_messages state, we should not be processing buffered messages")
    }
    this.transitionToState({ type: "processing", messages: this.state.messages })

    const response = await this.generateResponse()
    if (!response) {
      logger.error(`(${this.getBrainDump().playerData.username}) We couldn't generate response`)
      // throw new Error("We couldn't generate response")
      return
    }
    if (response.type === "endedConversation") {
      return
    }
    // @ts-ignore
    if (this.state.type === "processing") {
      const chunks = this.splitIntoChunks(response.finalChatMessage)
      // logger.debug(
      //   `(${this.getBrainDump().playerData.username}) We succefuly splitted chunks and are transitioning to responding`,
      // )
      this.transitionToState({
        type: "responding",
        chunksToEmit: chunks,
        emittedChunks: [],
        timeSinceLastMessage: 0,
      })
    } else {
      // logger.debug(`(${this.getBrainDump().playerData.username}) State got changed outside of this method`)
      // console.log(this.state)
    }
  }

  private emitNextChunk() {
    if (this.state.type !== "responding") {
      logger.error(
        `(${this.getBrainDump().playerData.username}) TalkAction is not in responding state, we should not be emitting chunks`,
      )
      // throw new Error("TalkAction is not in responding state, we should not be emitting chunks")
      return
    }

    const nextChunk = this.state.chunksToEmit.shift()
    if (!nextChunk) {
      // logger.debug(
      //   `(${this.getBrainDump().playerData.username}) No next chunk to emit transitioning to awaiting_message`,
      // )
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
      logger.error(
        `(${this.getBrainDump().playerData.username}) TalkAction is completed, we should not be ending conversation`,
      )
      // throw new Error("TalkAction is completed, we should not be ending conversation")
      return reason
    }
    this.isCompletedFlag = true

    if (!this.getBrainDump().getLatestThread(this.targetPlayerUsername).finished) {
      const finalMessage = createChatMessage(reason, this.targetPlayerUsername, this.getBrainDump().playerData.username)
      this.getBrainDump().addChatMessage(this.targetPlayerUsername, finalMessage)
      this.getBrainDump().closeThread(this.targetPlayerUsername)
      this.getEmitMethods().emitEndConversation(finalMessage)
    } else {
      logger.error(`(${this.getBrainDump().playerData.username}) TalkAction has a latest thread that is finished`)
      // throw new Error("TalkAction has a latest thread that is finished")
      return reason
    }

    return reason
  }

  async start() {
    this.isStarted = true
    this.getBrainDump().getNewestActiveThread(this.targetPlayerUsername)

    if (this.conversationType.type === "new") {
      const thread = this.getBrainDump().getNewestActiveThread(this.targetPlayerUsername)

      if (thread.messages.length > 0) {
        logger.error(
          `(${this.getBrainDump().playerData.username}) Starting new talkAction but it has an active thread that is not empty. Conversation type: ${JSON.stringify(this.conversationType)}`,
        )
        log_threads(this.getBrainDump(), this.targetPlayerUsername)
        // throw new Error("Starting new talkAction but it has an active thread that is not empty")
      }

      let response: TalkAIResponse | null = null

      if (this.conversationType.message) {
        response = {
          type: "gotString",
          finalChatMessage: this.conversationType.message,
        }
      } else {
        const aiBrainSummary = this.getBrainDump().getStringifiedBrainDump()
        const system_message = this.promptSystem.startConversation(aiBrainSummary, this.targetPlayerUsername)
        response = await generateAssistantResponse(system_message, [])
      }

      if (!response) {
        logger.error(`(${this.getBrainDump().playerData.username}) We couldn't generate response`)
        // throw new Error("We couldn't generate response")
        return
      }
      if (response.type !== "endedConversation") {
        const chunks = this.splitIntoChunks(response.finalChatMessage)
        // logger.debug(
        //   `(${this.getBrainDump().playerData.username}) We succefuly got start of conversation response and are transitioning to responding`,
        // )
        this.transitionToState({
          type: "responding",
          chunksToEmit: chunks,
          emittedChunks: [],
          timeSinceLastMessage: 0,
        })
      } else {
        logger.error(`(${this.getBrainDump().playerData.username}) We ended conversation before we started it`)
        // throw new Error("We ended conversation before we started it")
        return
      }
    } else {
      await this.handleMessage(this.conversationType.message)
    }
  }

  update(deltaTime: number) {
    if (this.isInterrupted || !this.isStarted || this.isCompletedFlag) return
    if (this.state.type === "processing") {
      return
    }

    this.elapsedTime += deltaTime
    this.movementController.move(deltaTime)
    this.state.timeSinceLastMessage += deltaTime

    switch (this.state.type) {
      case "buffering_messages":
        if (this.state.timeSinceLastMessage >= this.MESSAGE_BUFFER_TIMEOUT) {
          this.processBufferedMessages()
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
