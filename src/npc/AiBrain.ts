// AiBrain.ts
import { getTime } from "../shared/functions"
import { ChatMessage, PlayerData } from "../shared/types"
import { Action, Memory, PlanAction } from "./memory"
import client from "./openai"
import OpenAI from "openai"
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

  async startConversation(targetPlayer: string) {
    if (!this.memory.conversations.has(targetPlayer)) {
      this.memory.conversations.set(targetPlayer, [])
    }
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
    // TODO: create new thread
    return response
  }

  async handleMessage(chatMessage: ChatMessage): Promise<string> {
    // TODO: we should be retrieving the thread from the memory, not the whole conversation

    if (!this.memory.conversations.has(chatMessage.from)) {
      this.memory.conversations.set(chatMessage.from, [])
    }
    console.log("Handling message", chatMessage)
    console.log("Memory", this.memory.conversations.get(chatMessage.from))
    this.memory.conversations.get(chatMessage.from)?.push(chatMessage)

    // Add user message to conversation
    let messagesToSubmitted: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are an NPC with a backstory of ${this.backstory}. Respond to the other player.`,
      },
      ...(this.memory.conversations.get(chatMessage.from)?.map((message) => ({
        role: message.from === this.playerData.id ? "assistant" : "user",
        content: message.message,
      })) as ChatCompletionMessageParam[]),
    ]

    let responseContent = ""

    while (true) {
      try {
        // Call the OpenAI API
        console.log(messagesToSubmitted)

        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: messagesToSubmitted as ChatCompletionMessageParam[],
          tools: this.tools as ChatCompletionTool[],
          tool_choice: "auto",
        })

        const responseMessage = completion.choices[0].message

        messagesToSubmitted.push(responseMessage)

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

            // Add function result to conversation
            messagesToSubmitted.push({
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
}
