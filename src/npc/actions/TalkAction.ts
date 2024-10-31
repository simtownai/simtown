import logger from "../../shared/logger"
import { ChatMessage } from "../../shared/types"
import { EmitInterface } from "../SocketManager"
import { BrainDump } from "../brain/AIBrain"
import { FunctionSchema, functionToSchema } from "../openai/aihelper"
import { continue_conversation, start_conversation } from "../prompts"
import { Action } from "./Action"
import { TalkAIResponse, createChatMessage, generateAssistantResponse } from "./generateMessage"
import { z } from "zod"

type EmissionState = {
  chunksToBeEmitted: string[]
  emittedContent: string
  timeSinceLastChunk: number
}
type IncomingMessageState = {
  messageBuffer: ChatMessage[]
  responseTimer: NodeJS.Timeout | null // for delaying response after getting a message
}
type ExistingConversationType = { type: "existing"; message: ChatMessage }
type NewConversationType = { type: "new" }
export type ConversationType = ExistingConversationType | NewConversationType

export class TalkAction extends Action {
  private tools: FunctionSchema[]
  private functionMap: { [functionName: string]: Function }
  private conversationTimeout: NodeJS.Timeout | null = null // for automatically timing out if no response after sending a message
  private ConversationTimeoutThreshold = 15000

  private addEmittedContentToAIMessages() {
    if (this.emissionState.emittedContent) {
      this.getBrainDump().addAIMessage(this.targetPlayerUsername, {
        role: "assistant",
        content: this.emissionState.emittedContent,
      })
    }
  }

  private readonly MESSAGE_BUFFER_DELAY = 3000 // 3 seconds
  private readonly CHUNK_DELAY = 1000 // 1 second

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
  ) {
    super(getBrainDump, getEmitMethods, reason)
    this.tools = [this.endConversationTool]
    this.functionMap = {
      endConversation: (args: { reason: string }) => this.endConversation(args.reason),
    }
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
    return message.match(/[^.!?]+[.!?]+/g) || [message]
  }

  handleEmittedChunk(chunk: string) {
    // Add to accumulated content
    this.emissionState.emittedContent += chunk

    // Create and emit the message
    const chatMessage = createChatMessage(chunk, this.targetPlayerUsername, this.getBrainDump().playerData.username)
    this.getEmitMethods().emitSendMessage(chatMessage)

    // Save the individual chunk as a chat message
    this.getBrainDump().addChatMessage(this.targetPlayerUsername, chatMessage)

    // If this was the last chunk, save the complete message to AI messages
    if (this.emissionState.chunksToBeEmitted.length === 0) {
      this.addEmittedContentToAIMessages()
      // Reset emitted content after saving
      this.resetEmissionState()
      // Reset timers and prepare for next message
    }
    this.resetResponseTimer()
    this.resetConversationTimeout()
  }

  clearAllListeners() {
    this.addEmittedContentToAIMessages()
    this.resetEmissionState()
    this.incomingMessageState.messageBuffer = []
    if (this.conversationTimeout) {
      clearTimeout(this.conversationTimeout)
      this.conversationTimeout = null
    }
    if (this.incomingMessageState.responseTimer) {
      clearTimeout(this.incomingMessageState.responseTimer)
      this.incomingMessageState.responseTimer = null
    }
  }

  clearAllListenersAndMarkAsCompleted() {
    this.clearAllListeners()
    this.isCompletedFlag = true
  }

  endConversation(reason: string) {
    this.clearAllListenersAndMarkAsCompleted()
    this.getBrainDump().addAIMessage(this.targetPlayerUsername, {
      role: "assistant",
      content: reason,
    })
    const finalMessage = createChatMessage(reason, this.targetPlayerUsername, this.getBrainDump().playerData.username)
    this.getBrainDump().addChatMessage(this.targetPlayerUsername, finalMessage)
    this.getBrainDump().closeThread(this.targetPlayerUsername)
    const threads = this.getBrainDump().conversations.threads
    console.log("Current player is", this.getBrainDump().playerData.username)
    for (const thread of threads) {
      const playerId = thread[0]
      const messages = thread[1]
      console.log("Player id", playerId)
      for (const message of messages) {
        console.log("Finsihed is", message.finished)
        console.log(message.aiMessages)
        console.log(message.messages)
      }
    }

    this.getEmitMethods().emitEndConversation(finalMessage)
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
      this.tools,
      this.functionMap,
    )
    this.handleGeneratedResponse(response)

    const first_chunk = this.emissionState.chunksToBeEmitted.shift()!
    this.handleEmittedChunk(first_chunk)
  }

  private endConversationTool = functionToSchema(
    this.endConversation,
    z.object({ reason: z.string() }),
    "Use this function to decline or finish the conversation by giving a reason.",
  )

  async handleMessage(chatMessage: ChatMessage) {
    this.getBrainDump().addChatMessage(chatMessage.from, chatMessage)
    this.addEmittedContentToAIMessages()
    this.resetEmissionState()
    this.resetResponseTimer()
    this.resetConversationTimeout()

    this.incomingMessageState.messageBuffer.push(chatMessage)
  }

  private endConversationDueToTimeout() {
    const timeoutMessage =
      "I'm sorry, but I haven't heard from you in a while. I'll have to end our conversation for now. Feel free to chat with me again later!"

    this.endConversation(timeoutMessage)
  }

  private resetConversationTimeout() {
    if (this.conversationTimeout) {
      clearTimeout(this.conversationTimeout)
    }

    this.conversationTimeout = setTimeout(() => {
      this.endConversationDueToTimeout()
    }, this.ConversationTimeoutThreshold)
  }

  private resetResponseTimer() {
    if (this.incomingMessageState.responseTimer) {
      clearTimeout(this.incomingMessageState.responseTimer)
    }
    this.incomingMessageState.responseTimer = setTimeout(() => {
      this.processBufferedMessages().catch((error) => {
        logger.error("Error processing buffered messages:", error)
      })
    }, this.MESSAGE_BUFFER_DELAY)
  }

  private async processBufferedMessages() {
    // Clear the response timer
    this.incomingMessageState.responseTimer = null

    // Check if there are messages to process
    if (this.incomingMessageState.messageBuffer.length === 0) {
      console.log("No messages to process")
      return
    }

    // Combine messages into a single content
    const combinedContent = this.incomingMessageState.messageBuffer.map((msg) => msg.message).join("\n")

    // Add to AI messages after timeout
    this.getBrainDump().addAIMessage(this.targetPlayerUsername, { role: "user", content: combinedContent })

    // Clear the buffer
    this.incomingMessageState.messageBuffer = []

    // Generate assistant response
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

  setIsCompletedFlag(flag: boolean) {
    this.isCompletedFlag = flag
  }

  async update(deltaTime: number) {
    if (this.isInterrupted || !this.isStarted || this.isCompletedFlag) return

    this.elapsedTime += deltaTime

    // Handle chunk emission
    if (this.emissionState.chunksToBeEmitted.length > 0) {
      this.emissionState.timeSinceLastChunk += deltaTime

      if (this.emissionState.timeSinceLastChunk >= this.CHUNK_DELAY) {
        const chunk = this.emissionState.chunksToBeEmitted.shift()!
        this.handleEmittedChunk(chunk)
        this.emissionState.timeSinceLastChunk = 0
      }
    }
  }
  interrupt(): void {
    super.interrupt()
    this.clearAllListeners()
  }

  resume(): void {
    super.resume()
    this.resetConversationTimeout()
  }
}
