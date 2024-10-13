// AiBrain.ts
import client from "./openai" // Import your OpenAI client
import { ChatCompletionMessageParam } from "openai/src/resources/index.js"

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
  systemMessage: string
  tools: FunctionSchema[]
  functionMap: { [functionName: string]: Function }
}

export class AiBrain {
  private client: any
  private systemMessage: string
  private tools: FunctionSchema[]
  private functionMap: { [functionName: string]: Function }
  private messages: ChatCompletionMessageParam[]

  constructor(options: AiBrainOptions) {
    this.client = client
    this.systemMessage = options.systemMessage
    this.tools = options.tools
    this.functionMap = options.functionMap
    this.messages = []
  }

  async handleMessage(chatMessage: string): Promise<string> {
    // Add user message to conversation
    this.messages.push({ role: "user", content: chatMessage })

    let responseContent = ""

    while (true) {
      try {
        // Call the OpenAI API
        console.log(`Sending messages: ${JSON.stringify(this.messages)}`);

        const completion = await this.client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: this.systemMessage }, ...this.messages],
          tools: this.tools,
          tool_choice: "auto",
        })

        const responseMessage = completion.choices[0].message

        // Add assistant response to conversation
        this.messages.push(responseMessage)

        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
          // Handle function calls
          for (const toolCall of responseMessage.tool_calls) {
            const functionName = toolCall.function.name
            const functionArgs = JSON.parse(toolCall.function.arguments)
            const functionResult = await this.executeFunction(functionName, functionArgs)
            if (!functionResult) {
              throw new Error(`Function ${functionName} returned undefined`)
            }
            console.log(`Function ${functionName} returned: ${functionResult}`);

            // Add function result to conversation
            this.messages.push({
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
