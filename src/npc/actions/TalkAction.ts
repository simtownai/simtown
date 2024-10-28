import { ChatMessage } from "../../shared/types"
import { EmitInterface } from "../SocketManager"
import { BrainDump } from "../brain/AIBrain"
import { ConversationTimeoutThreshold } from "../npcConfig"
import { FunctionSchema, functionToSchema } from "../openai/aihelper"
import client from "../openai/openai"
import { continue_conversation, start_conversation } from "../prompts"
import { Action } from "./Action"
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/index.mjs"
import { z } from "zod"

type ExistingConversationType = { type: "existing"; message: ChatMessage }
type NewConversationType = { type: "new" }
export type ConversationType = ExistingConversationType | NewConversationType

export class TalkAction extends Action {
  private tools: FunctionSchema[]
  private functionMap: { [functionName: string]: Function }
  private conversationTimeout: NodeJS.Timeout | null

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
    this.conversationTimeout = null
  }

  getTargetPlayerUsername() {
    return this.targetPlayerUsername
  }
  endConversation(reason: string) {
    console.log("Ending conversation with reason", reason)
    this.isCompletedFlag = true
    return reason
  }

  async startConversation(targetPlayerUsername: string) {
    this.getBrainDump().getNewestActiveThread(targetPlayerUsername)
    this.clearConversationTimeout()

    const aiBrainSummary = this.getBrainDump().getStringifiedBrainDump()

    const system_message = start_conversation(aiBrainSummary, this.targetPlayerUsername)

    const responseContent = await this.generateAssistantResponse(system_message, targetPlayerUsername)

    if (this.getBrainDump().isLatestThreadActive(targetPlayerUsername)) {
      const response = this.handleFinalChatResponse(responseContent, targetPlayerUsername)
      this.getEmitMethods().emitSendMessage(response)
      this.adjustDirection(targetPlayerUsername)
      this.setConversationTimeout(targetPlayerUsername)
    }
  }

  private endConversationTool = functionToSchema(
    this.endConversation,
    z.object({ reason: z.string() }),
    "Use this function to decline or finish the conversation by giving a reason.",
  )

  private clearConversationTimeout() {
    if (this.conversationTimeout) {
      clearTimeout(this.conversationTimeout)
      this.conversationTimeout = null
    }
  }

  private handleFinalChatResponse(responseContent: string, targetPlayerUsername: string): ChatMessage {
    const response: ChatMessage = {
      from: this.getBrainDump().playerData.username,
      message: responseContent,
      to: targetPlayerUsername,
      date: new Date().toISOString(),
    }
    this.getBrainDump().addChatMessage(targetPlayerUsername, response)

    return response
  }

  async generateAssistantResponse(system_message: string, targetPlayerUsername: string): Promise<string> {
    let responseContent = ""
    while (true) {
      let toSubmit = [
        { role: "system", content: system_message } as ChatCompletionMessageParam,
        ...this.getBrainDump().getNewestActiveThread(targetPlayerUsername).aiMessages,
      ]

      try {
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: toSubmit,
          tools: this.tools as ChatCompletionTool[],
          tool_choice: "auto",
        })

        const responseMessage = completion.choices[0].message

        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
          this.getBrainDump().addAIMessage(targetPlayerUsername, responseMessage)

          for (const toolCall of responseMessage.tool_calls) {
            try {
              const functionName = toolCall.function.name
              const functionArgs = JSON.parse(toolCall.function.arguments)

              const functionResult = await this.executeFunction(functionName, functionArgs)

              this.getBrainDump().addAIMessage(targetPlayerUsername, {
                role: "tool",
                tool_call_id: toolCall.id,
                content: functionResult,
              })

              if (functionName === "endConversation") {
                this.clearConversationTimeout()
                const response = this.handleFinalChatResponse(functionResult, targetPlayerUsername)
                this.getEmitMethods().emitEndConversation(response)
                this.adjustDirection(targetPlayerUsername)
                this.getBrainDump().closeThread(targetPlayerUsername)
                return ""
              }
            } catch (error: any) {
              this.getBrainDump().addAIMessage(targetPlayerUsername, {
                role: "tool",
                tool_call_id: toolCall.id,
                content: error.message,
              })
              console.error("Error executing function:", error)
            }
          }
          continue
        } else if (responseMessage.content) {
          responseContent = responseMessage.content
          this.getBrainDump().addAIMessage(targetPlayerUsername, responseMessage)
          break
        } else {
          break
        }
      } catch (error) {
        console.error("Error generating assistant response:", error)
        throw error
      }
    }
    return responseContent
  }

  private async executeFunction(functionName: string, args: any): Promise<any> {
    const func = this.functionMap[functionName]
    if (func) {
      return await func(args)
    } else {
      throw new Error(`Unknown function: ${functionName}`)
    }
  }

  async handleMessage(chatMessage: ChatMessage) {
    this.clearConversationTimeout()
    this.setConversationTimeout(chatMessage.from)

    this.getBrainDump().addChatMessage(chatMessage.from, chatMessage)
    this.getBrainDump().addAIMessage(chatMessage.from, { role: "user", content: chatMessage.message })

    const aiBrainSummary = this.getBrainDump().getStringifiedBrainDump()
    const system_message = continue_conversation(aiBrainSummary, chatMessage.from)

    const responseContent = await this.generateAssistantResponse(system_message, chatMessage.from)

    if (this.getBrainDump().isLatestThreadActive(chatMessage.from)) {
      const response = this.handleFinalChatResponse(responseContent, chatMessage.from)
      this.getEmitMethods().emitSendMessage(response)
      this.adjustDirection(chatMessage.from)
    }
  }

  private setConversationTimeout(targetPlayerUsername: string) {
    this.conversationTimeout = setTimeout(() => {
      this.endConversationDueToTimeout(targetPlayerUsername)
    }, ConversationTimeoutThreshold)
  }

  private endConversationDueToTimeout(targetPlayerUsername: string) {
    console.log("ending conversation due to timeout")
    const timeoutMessage =
      "I'm sorry, but I haven't heard from you in a while. I'll have to end our conversation for now. Feel free to chat with me again later!"
    const response = this.handleFinalChatResponse(timeoutMessage, targetPlayerUsername)
    this.getBrainDump().closeThread(targetPlayerUsername)
    this.getEmitMethods().emitEndConversation(response)
    this.adjustDirection(targetPlayerUsername)
    this.isCompletedFlag = true
  }

  async start() {
    this.isStarted = true
    if (this.conversationType.type === "new") {
      await this.startConversation(this.targetPlayerUsername)
    } else {
      await this.handleMessage(this.conversationType.message)
    }
  }

  async update(_deltaTime: number) {
    if (this.isInterrupted || !this.isStarted) return

    if (!this.getBrainDump().isLatestThreadActive(this.targetPlayerUsername)) {
      console.log("Conversation completed.")
      this.isCompletedFlag = true
    }
  }

  interrupt(): void {
    super.interrupt()

    console.log("Interrupting talking action")

    // Clear the conversation timeout
    this.clearConversationTimeout()
  }

  resume(): void {
    super.resume()
    this.setConversationTimeout(this.targetPlayerUsername)
  }
}
