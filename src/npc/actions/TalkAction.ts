import logger from "../../shared/logger"
import { ChatMessage, MoveTarget } from "../../shared/types"
import { MovementController } from "../MovementController"
import { EmitInterface } from "../SocketManager"
import { BrainDump } from "../brain/AIBrain"
import { log_threads } from "../loghelpers"
import { FunctionSchema, functionToSchema } from "../openai/aihelper"
import { continue_conversation, start_conversation } from "../prompts"
import { Action } from "./Action"
import { TalkAIResponse, createChatMessage, generateAssistantResponse } from "./generateMessage"
import { z } from "zod"

export const TIMEOUT_MESSAGE =
  "I'm sorry, but I haven't heard from you in a while. I'll have to end our conversation for now. Feel free to chat with me again later!"

type EmissionState = {
  chunksToBeEmitted: string[]
  emittedContent: string
  timeSinceLastChunk: number
}

type IncomingMessageState = {
  messageBuffer: ChatMessage[]
  responseTimer: NodeJS.Timeout | null
}

type ExistingConversationType = { type: "existing"; message: ChatMessage }
type NewConversationType = { type: "new" }
export type ConversationType = ExistingConversationType | NewConversationType

export class TalkAction extends Action {
  private tools: FunctionSchema[]
  private functionMap: { [functionName: string]: Function }
  private conversationTimeout: NodeJS.Timeout | null = null
  private readonly ConversationTimeoutThreshold = 15000
  private readonly MESSAGE_BUFFER_DELAY = 3000
  private readonly CHUNK_DELAY = 1000

  private emissionState: EmissionState = {
    chunksToBeEmitted: [],
    emittedContent: "",
    timeSinceLastChunk: 0,
  }

  private incomingMessageState: IncomingMessageState = {
    messageBuffer: [],
    responseTimer: null,
  }

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

  private addEmittedContentToAIMessages() {
    if (this.emissionState.emittedContent) {
      if (!this.isCompletedFlag) {
        this.resetConversationTimeout()
      }
      this.getBrainDump().addAIMessage(this.targetPlayerUsername, {
        role: "assistant",
        content: this.emissionState.emittedContent,
      })
    }
  }

  private endConversationDueToTimeout() {
    logger.debug(
      `[TIMEOUT] (${this.getBrainDump().playerData.username}) Timeout handler triggered for ${
        this.targetPlayerUsername
      }. isCompletedFlag=${this.isCompletedFlag}, conversationTimeout=${!!this.conversationTimeout}`,
    )

    // Move this check before any side effects
    if (this.isCompletedFlag) {
      logger.debug(
        `[TIMEOUT] (${this.getBrainDump().playerData.username}) Skipping timeout handler - conversation already completed with ${
          this.targetPlayerUsername
        }`,
      )
      return
    }

    logger.debug(
      `[TIMEOUT] (${this.getBrainDump().playerData.username}) Executing timeout handler for ${this.targetPlayerUsername}`,
    )
    log_threads(this.getBrainDump(), this.targetPlayerUsername)

    // Clear timeout before calling endConversation to prevent races
    if (this.conversationTimeout) {
      clearTimeout(this.conversationTimeout)
      this.conversationTimeout = null
    }

    this.endConversation(TIMEOUT_MESSAGE)
  }

  private resetConversationTimeout() {
    const username = this.getBrainDump().playerData.username
    logger.debug(
      `[TIMEOUT] (${username}) Resetting timeout for ${
        this.targetPlayerUsername
      }. Current state: isCompletedFlag=${this.isCompletedFlag}, hasTimeout=${!!this.conversationTimeout}`,
    )

    if (this.conversationTimeout) {
      logger.debug(`[TIMEOUT] (${username}) Clearing existing timeout for ${this.targetPlayerUsername}`)
      clearTimeout(this.conversationTimeout)
      this.conversationTimeout = null
    }

    if (this.isCompletedFlag) {
      logger.debug(
        `[TIMEOUT] (${username}) Not setting new timeout for ${this.targetPlayerUsername} - conversation completed`,
      )
      return
    }

    logger.debug(`[TIMEOUT] (${username}) Setting new timeout for ${this.targetPlayerUsername}`)
    this.conversationTimeout = setTimeout(() => {
      logger.debug(
        `[TIMEOUT] (${username}) Timeout fired for ${this.targetPlayerUsername}. isCompletedFlag=${
          this.isCompletedFlag
        }, hasTimeout=${!!this.conversationTimeout}`,
      )
      this.endConversationDueToTimeout()
    }, this.ConversationTimeoutThreshold)
  }

  resetEmissionState() {
    this.emissionState = {
      chunksToBeEmitted: [],
      emittedContent: "",
      timeSinceLastChunk: 0,
    }
  }

  getTargetPlayerUsername() {
    return this.targetPlayerUsername
  }

  private splitMessageIntoChunks(message: string): string[] {
    const chunks = message.match(/[^.!?]+[.!?]+/g) || [message]
    return chunks.filter((chunk) => chunk.length > 0)
  }

  emitChunk(chunk: string) {
    if (this.isCompletedFlag || chunk.length < 1) return

    this.emissionState.emittedContent += chunk

    const chatMessage = createChatMessage(chunk, this.targetPlayerUsername, this.getBrainDump().playerData.username)

    const moveTarget: MoveTarget = { name: this.targetPlayerUsername, targetType: "person" }
    if (!this.movementController.ifMoveTargetReached(moveTarget)) {
      this.movementController.initiateMovement(moveTarget)
      this.movementController.resume()
    }

    this.getEmitMethods().emitSendMessage(chatMessage)
    this.getBrainDump().addChatMessage(this.targetPlayerUsername, chatMessage)

    if (this.emissionState.chunksToBeEmitted.length === 0) {
      this.addEmittedContentToAIMessages()
      this.resetEmissionState()
      this.resetResponseTimer()
    }
  }

  markAsCompleted() {
    this.isCompletedFlag = true
  }
  clearAllListeners() {
    logger.debug(
      `[TIMEOUT] (${this.getBrainDump().playerData.username}) Clearing listeners for ${
        this.targetPlayerUsername
      }. Current state: isCompletedFlag=${this.isCompletedFlag}, hasTimeout=${!!this.conversationTimeout}`,
    )

    this.addEmittedContentToAIMessages()
    this.resetEmissionState()
    this.incomingMessageState.messageBuffer = []

    if (this.conversationTimeout) {
      logger.debug(
        `[TIMEOUT] (${this.getBrainDump().playerData.username}) Clearing timeout in clearAllListeners for ${
          this.targetPlayerUsername
        }`,
      )
      clearTimeout(this.conversationTimeout)
      this.conversationTimeout = null
    }
    if (this.incomingMessageState.responseTimer) {
      clearTimeout(this.incomingMessageState.responseTimer)
      this.incomingMessageState.responseTimer = null
    }
  }

  endConversation(reason: string) {
    logger.debug(
      `[TIMEOUT] (${this.getBrainDump().playerData.username}) Ending conversation with ${
        this.targetPlayerUsername
      }. Current state: isCompletedFlag=${this.isCompletedFlag}, hasTimeout=${!!this.conversationTimeout}`,
    )

    // Early return if already completed
    if (this.isCompletedFlag && reason === TIMEOUT_MESSAGE) {
      logger.debug(
        `[TIMEOUT] (${this.getBrainDump().playerData.username}) Skipping duplicate timeout end for ${
          this.targetPlayerUsername
        }`,
      )
      return reason
    }

    this.isCompletedFlag = true

    if (this.conversationTimeout) {
      logger.debug(
        `[TIMEOUT] (${this.getBrainDump().playerData.username}) Clearing timeout in endConversation for ${
          this.targetPlayerUsername
        }`,
      )
      clearTimeout(this.conversationTimeout)
      this.conversationTimeout = null
    }

    // Only proceed with conversation end if not already ended
    if (!this.getBrainDump().getLatestThread(this.targetPlayerUsername).finished) {
      this.getBrainDump().addAIMessage(this.targetPlayerUsername, {
        role: "assistant",
        content: reason,
      })
      const finalMessage = createChatMessage(reason, this.targetPlayerUsername, this.getBrainDump().playerData.username)
      this.getBrainDump().addChatMessage(this.targetPlayerUsername, finalMessage)
      this.getBrainDump().closeThread(this.targetPlayerUsername)
      this.getEmitMethods().emitEndConversation(finalMessage)
    }

    this.clearAllListeners()
    return reason
  }

  handleGeneratedResponse(response: TalkAIResponse) {
    if (response.type === "endedConversation") {
      return
    }
    const chunks = this.splitMessageIntoChunks(response.finalChatMessage)
    this.emissionState.chunksToBeEmitted.push(...chunks)
  }

  async startConversation() {
    const aiBrainSummary = this.getBrainDump().getStringifiedBrainDump()
    const system_message = start_conversation(aiBrainSummary, this.targetPlayerUsername)

    const response = await generateAssistantResponse(
      system_message,
      this.getBrainDump().getNewestActiveThread(this.targetPlayerUsername).aiMessages,
    )
    this.handleGeneratedResponse(response)

    const first_chunk = this.emissionState.chunksToBeEmitted.shift()!
    this.emitChunk(first_chunk)
  }

  private endConversationTool = functionToSchema(
    this.endConversation,
    z.object({ reason: z.string() }),
    "Use this function to decline or finish the conversation by giving a reason.",
  )

  async handleMessage(chatMessage: ChatMessage) {
    if (!this.isCompletedFlag) {
      this.resetConversationTimeout()
    }

    this.getBrainDump().addChatMessage(chatMessage.from, chatMessage)
    this.addEmittedContentToAIMessages()
    this.resetEmissionState()
    this.resetResponseTimer()

    this.incomingMessageState.messageBuffer.push(chatMessage)
  }

  private resetResponseTimer() {
    if (this.incomingMessageState.responseTimer) {
      clearTimeout(this.incomingMessageState.responseTimer)
      this.incomingMessageState.responseTimer = null
    }

    if (this.isCompletedFlag) return

    this.incomingMessageState.responseTimer = setTimeout(() => {
      this.processBufferedMessages().catch((error) => {
        logger.error("Error processing buffered messages:", error)
      })
    }, this.MESSAGE_BUFFER_DELAY)
  }

  private async processBufferedMessages() {
    if (this.incomingMessageState.messageBuffer.length === 0) {
      logger.info(`${this.getBrainDump().playerData.username} has no messages to process`)
      return
    }

    const combinedContent = this.incomingMessageState.messageBuffer.map((msg) => msg.message).join("\n")
    this.getBrainDump().addAIMessage(this.targetPlayerUsername, { role: "user", content: combinedContent })
    this.incomingMessageState.messageBuffer = []

    const aiBrainSummary = this.getBrainDump().getStringifiedBrainDump()
    const system_message = continue_conversation(aiBrainSummary, this.targetPlayerUsername)

    const response = await generateAssistantResponse(
      system_message,
      this.getBrainDump().getNewestActiveThread(this.targetPlayerUsername).aiMessages,
      this.tools,
      this.functionMap,
    )
    this.handleGeneratedResponse(response)
  }

  async start() {
    this.isStarted = true
    this.getBrainDump().getNewestActiveThread(this.targetPlayerUsername)

    if (this.conversationType.type === "new") {
      await this.startConversation()
    } else {
      await this.handleMessage(this.conversationType.message)
    }
  }

  async update(deltaTime: number) {
    if (this.isInterrupted || !this.isStarted || this.isCompletedFlag) return

    this.movementController.move(deltaTime)

    if (this.emissionState.chunksToBeEmitted.length > 0) {
      this.emissionState.timeSinceLastChunk += deltaTime

      if (this.emissionState.timeSinceLastChunk >= this.CHUNK_DELAY) {
        const chunk = this.emissionState.chunksToBeEmitted.shift()!
        this.emitChunk(chunk)
        this.emissionState.timeSinceLastChunk = 0
      }
    }
  }

  interrupt(): void {
    super.interrupt()
    this.shouldReflect = false
    this.clearAllListeners()
  }

  resume(): void {
    super.resume()
    this.shouldReflect = true

    if (!this.isCompletedFlag) {
      this.resetConversationTimeout()
    }
  }
}
