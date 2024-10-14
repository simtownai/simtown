// AiBrain.ts
import { getTime } from "../shared/functions"
import { ChatMessage, PlayerData } from "../shared/types"
import { functionToSchema } from "./aihelper"
import { Memory, PlanAction } from "./memory"
import { ConversationTimeoutThreshold, NpcConfig } from "./npcConfig"
import client from "./openai"
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/src/resources/index.js"
import { Socket } from "socket.io-client"
import { z } from "zod"

export interface FunctionSchema {
  type: string
  function: {
    name: string
    description: string
    parameters: {
      type: string
      properties: { [key: string]: any }
      required: string[]
    }
  }
}

interface AiBrainOptions {
  npcConfig: NpcConfig
  tools: FunctionSchema[]
  functionMap: { [functionName: string]: Function }
  playerData: PlayerData
  socket: Socket
}

export class AiBrain {
  private socket: Socket
  private tools: FunctionSchema[]
  private functionMap: { [functionName: string]: Function }
  public memory: Memory
  public currentAction: PlanAction
  private playerData: PlayerData
  private conversationTimeout: NodeJS.Timeout | null = null

  private endConversationTool = functionToSchema(
    this.endConversation,
    z.object({ reason: z.string() }),
    "use this function to decline or finsih conversation giving a reason",
  )

  constructor(options: AiBrainOptions) {
    this.tools = [this.endConversationTool, ...options.tools]
    this.functionMap = {
      ...options.functionMap,
      endConversation: (args: { targetPlayerId: string; reason: string }) => this.endConversation(args.reason),
    }
    this.memory = new Memory(options.npcConfig)
    this.currentAction = { duration: 30, start: getTime(), action: { type: "idle" } }
    this.playerData = options.playerData
    this.socket = options.socket
  }

  endConversation(reason: string) {
    return reason
  }

  async plan() {}

  async startConversation(targetPlayerId: string) {
    // Clear any existing timeout
    this.clearConversationTimeout()

    const message = {
      role: "system",
      content: `You are an NPC with a backstory of ${this.memory.backstory}. Generate a conversation starter with another player.`,
    } as ChatCompletionMessageParam
    const response =
      (
        await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [message],
        })
      ).choices[0].message.content || ""

    const newMessage = {
      from: this.playerData.id,
      message: response,
      to: targetPlayerId,
      date: new Date().toISOString(),
    }
    const newAIMessage = {
      role: "assistant",
      content: response,
    } as ChatCompletionMessageParam

    this.memory.conversations.addChatMessage(newMessage)
    this.memory.conversations.addAIMessage(targetPlayerId, newAIMessage)

    this.socket.emit("sendMessage", newMessage)
    // Set the conversation timeout
    this.setConversationTimeout(targetPlayerId)

    return newMessage
  }

  private handleFinalChatResponse(responseContent: string, targetPlayerId: string): ChatMessage {
    const response = {
      from: this.playerData.id,
      message: responseContent,
      to: targetPlayerId,
      date: new Date().toISOString(),
    }
    this.memory.conversations.addChatMessage(response)

    return response
  }

  async handleMessage(chatMessage: ChatMessage): Promise<ChatMessage> {
    // Clear and reset the conversation timeout
    this.clearConversationTimeout()
    this.setConversationTimeout(chatMessage.from)

    this.memory.conversations.addChatMessage(chatMessage)
    this.memory.conversations.addAIMessage(chatMessage.from, { role: "user", content: chatMessage.message })

    let responseContent = ""

    while (true) {
      let messagesToSubmitted: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `You are an NPC with a backstory of ${this.memory.backstory}.`,
        },
        ...this.memory.conversations.getNewestActiveThread(chatMessage.from).aiMessages,
      ]
      console.log("We are submitting to openai")
      console.log(messagesToSubmitted)
      try {
        // Call the OpenAI API
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: messagesToSubmitted as ChatCompletionMessageParam[],
          tools: this.tools as ChatCompletionTool[],
          tool_choice: "auto",
        })

        const responseMessage = completion.choices[0].message

        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
          // Handle function calls
          for (const toolCall of responseMessage.tool_calls) {
            this.memory.conversations.addAIMessage(chatMessage.from, responseMessage)

            const functionName = toolCall.function.name
            const functionArgs = JSON.parse(toolCall.function.arguments)
            const functionResult = await this.executeFunction(functionName, functionArgs)
            if (!functionResult) {
              throw new Error(`Function ${functionName} returned undefined`)
            }
            console.log(`Function ${functionName} returned: ${functionResult}`)

            this.memory.conversations.addAIMessage(chatMessage.from, {
              role: "tool",
              tool_call_id: toolCall.id,
              content: functionResult,
            })
            if (functionName === "endConversation") {
              console.log("Ending conversation for player", this.memory.backstory)
              const response = this.handleFinalChatResponse(functionResult, chatMessage.from)
              this.socket.emit("endConversation", response)
              this.clearConversationTimeout()
              this.memory.conversations.closeThread(chatMessage.from)
              return response
            }
          }
          // Continue the loop to get the next assistant response
          continue
        } else if (responseMessage.content) {
          // Assistant provided a final response
          this.memory.conversations.addAIMessage(chatMessage.from, responseMessage)

          responseContent = responseMessage.content

          break
        } else {
          // No content or function calls; exit loop
          break
        }
      } catch (error) {
        console.error("Error handling message:", error)
        throw error
      }
    }

    const response = this.handleFinalChatResponse(responseContent, chatMessage.from)
    this.socket.emit("sendMessage", response)
    return response
  }

  private async executeFunction(functionName: string, args: any): Promise<any> {
    const func = this.functionMap[functionName]
    if (func) {
      return await func(args)
    } else {
      throw new Error(`Unknown function: ${functionName}`)
    }
  }

  private clearConversationTimeout() {
    if (this.conversationTimeout) {
      clearTimeout(this.conversationTimeout)
      this.conversationTimeout = null
    }
  }

  private setConversationTimeout(targetPlayerId: string) {
    this.conversationTimeout = setTimeout(() => {
      this.endConversationDueToTimeout(targetPlayerId)
    }, ConversationTimeoutThreshold) // 60 seconds
  }

  private endConversationDueToTimeout(targetPlayerId: string) {
    const timeoutMessage =
      "I'm sorry, but I haven't heard from you in a while. I'll have to end our conversation for now. Feel free to chat with me again later!"
    const response = this.handleFinalChatResponse(timeoutMessage, targetPlayerId)
    this.memory.conversations.closeThread(targetPlayerId)
    this.socket.emit("endConversation", response)
    console.log("Conversation ended due to timeout:")
  }
}
