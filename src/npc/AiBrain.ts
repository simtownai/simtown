// AiBrain.ts
import { getTime } from "../shared/functions"
import { ChatMessage, PlayerData } from "../shared/types"
import { Memory, PlanAction } from "./memory"
import client from "./openai"
// Import your OpenAI client
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/src/resources/index.js"

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
  backstory: string
  tools: FunctionSchema[]
  functionMap: { [functionName: string]: Function }
  playerData: PlayerData
}

export class AiBrain {
  private backstory: string
  private tools: FunctionSchema[]
  private functionMap: { [functionName: string]: Function }
  public memory: Memory
  public currentAction: PlanAction
  private playerData: PlayerData

  constructor(options: AiBrainOptions) {
    this.backstory = options.backstory
    this.tools = options.tools
    this.functionMap = options.functionMap
    this.memory = new Memory(options.backstory)
    this.currentAction = { duration: 30, start: getTime(), action: { type: "idle" } }
    this.playerData = options.playerData
  }

  async plan() {}

  async startConversation(targetPlayerId: string) {
    const message = {
      role: "system",
      content: `You are an NPC with a backstory of ${this.backstory}. Generate a conversation starter with another player.`,
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

    console.log("NPC id is", this.playerData.id)
    console.log("Target player id is", targetPlayerId)
    console.log("We are at the end of startConversation with keys")
    console.log(this.memory.conversations.threads.keys())
    console.log("Conversation memory ai")
    console.log(this.memory.conversations.getNewestActiveThread(targetPlayerId).aiMessages)
    console.log("Conversation memory chat")
    console.log(this.memory.conversations.getNewestActiveThread(targetPlayerId).messages)

    return newMessage
  }

  async handleMessage(chatMessage: ChatMessage): Promise<ChatMessage> {
    this.memory.conversations.addChatMessage(chatMessage)
    this.memory.conversations.addAIMessage(chatMessage.from, { role: "user", content: chatMessage.message })

    let responseContent = ""

    while (true) {
      let messagesToSubmitted: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `You are an NPC with a backstory of ${this.backstory}. Respond to the other player.`,
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

        this.memory.conversations.addAIMessage(chatMessage.from, responseMessage)

        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
          // Handle function calls
          for (const toolCall of responseMessage.tool_calls) {
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
          }
          // Continue the loop to get the next assistant response
          continue
        } else if (responseMessage.content) {
          // Assistant provided a final response
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
    const replyMessage = {
      from: this.playerData.id,
      message: responseContent,
      to: chatMessage.from,
      date: new Date().toISOString(),
    }
    this.memory.conversations.addChatMessage(replyMessage)
    this.memory.conversations.addAIMessage(chatMessage.from, { role: "assistant", content: responseContent })
    return replyMessage
  }

  private async executeFunction(functionName: string, args: any): Promise<any> {
    const func = this.functionMap[functionName]
    if (func) {
      return await func(args)
    } else {
      throw new Error(`Unknown function: ${functionName}`)
    }
  }
}
