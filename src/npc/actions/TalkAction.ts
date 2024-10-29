import { ChatMessage } from "../../shared/types"
import { EmitInterface } from "../SocketManager"
import { BrainDump } from "../brain/AIBrain"
import { ConversationTimeoutThreshold } from "../npcConfig"
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
    private adjustDirection: (username: string) => void,
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
    console.log("Emitted content over time is", this.emissionState.emittedContent)

    // Create and emit the message
    const chatMessage = createChatMessage(chunk, this.targetPlayerUsername, this.getBrainDump().playerData.username)
    this.getEmitMethods().emitSendMessage(chatMessage)

    // Save the individual chunk as a chat message
    this.getBrainDump().addChatMessage(this.targetPlayerUsername, chatMessage)

    // If this was the last chunk, save the complete message to AI messages
    if (this.emissionState.chunksToBeEmitted.length === 0) {
      if (this.emissionState.emittedContent) {
        this.getBrainDump().addAIMessage(this.targetPlayerUsername, {
          role: "assistant",
          content: this.emissionState.emittedContent,
        })
      }
      // Reset emitted content after saving
      this.emissionState.emittedContent = ""

      // Reset timers and prepare for next message
      this.resetResponseTimer()
    }
  }

  endConversation(reason: string) {
    this.resetEmissionState()
    this.incomingMessageState.messageBuffer = []
    this.incomingMessageState.responseTimer = null
    this.isCompletedFlag = true
    this.conversationTimeout = null
    this.getBrainDump().addAIMessage(this.targetPlayerUsername, {
      role: "assistant",
      content: reason,
    })
    const finalMessage = createChatMessage(reason, this.targetPlayerUsername, this.getBrainDump().playerData.username)
    this.getBrainDump().addChatMessage(this.targetPlayerUsername, finalMessage)
    this.getBrainDump().closeThread(this.targetPlayerUsername)
    console.log("Emitting end conversation")
    this.getEmitMethods().emitEndConversation(finalMessage)
    return reason
  }

  handleGeneratedResponse(response: TalkAIResponse) {
    console.log("We got a generated response", response)
    if (response.type === "endedConversation") {
      return
    }
    const chunks = this.splitMessageIntoChunks(response.finalChatMessage)
    this.emissionState.chunksToBeEmitted.push(...chunks)
  }

  async startConversation() {
    console.log("starting conversation")
    const aiBrainSummary = this.getBrainDump().getStringifiedBrainDump()

    const system_message = start_conversation(aiBrainSummary, this.targetPlayerUsername)

    const response = await generateAssistantResponse(
      system_message,
      this.getBrainDump().getNewestActiveThread(this.targetPlayerUsername).aiMessages,
      this.tools,
      this.functionMap,
    )

    this.handleGeneratedResponse(response)
  }

  private endConversationTool = functionToSchema(
    this.endConversation,
    z.object({ reason: z.string() }),
    "Use this function to decline or finish the conversation by giving a reason.",
  )

  async handleMessage(chatMessage: ChatMessage) {
    if (this.emissionState.chunksToBeEmitted.length > 0) {
      console.log("Interrupting current emission due to new message")
      this.getBrainDump().addAIMessage(this.targetPlayerUsername, {
        role: "assistant",
        content: this.emissionState.emittedContent,
      })
      this.resetEmissionState()
    }

    this.resetResponseTimer()
    this.getBrainDump().addChatMessage(chatMessage.from, chatMessage)
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
    }, ConversationTimeoutThreshold)
  }

  private resetResponseTimer() {
    if (this.incomingMessageState.responseTimer) {
      clearTimeout(this.incomingMessageState.responseTimer)
    }
    this.incomingMessageState.responseTimer = setTimeout(() => {
      this.processBufferedMessages().catch((error) => {
        console.error("Error processing buffered messages:", error)
      })
    }, this.MESSAGE_BUFFER_DELAY)
  }

  private async processBufferedMessages() {
    console.log("=========================================")
    console.log("Processing buffered messages")
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

    // then we set a new conversation timeout
    this.resetConversationTimeout()

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
        this.resetConversationTimeout()
        this.emissionState.timeSinceLastChunk = 0
      }
    }
  }
  interrupt(): void {
    super.interrupt()
    this.conversationTimeout = null
    this.incomingMessageState.responseTimer = null
  }

  resume(): void {
    super.resume()
    this.resetConversationTimeout()
  }
}
