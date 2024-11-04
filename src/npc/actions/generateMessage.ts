import { ChatMessage } from "../../shared/types"
import { FunctionSchema } from "../openai/aihelper"
import client from "../openai/openai"
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/index.mjs"

const executeFunction = async (
  functionName: string,
  functionMap: { [functionName: string]: Function },
  args: any,
): Promise<string> => {
  const func = functionMap[functionName]
  if (func) {
    return await func(args)
  } else {
    throw new Error(`Unknown function: ${functionName}`)
  }
}

export const createChatMessage = (message: string, targetPlayerUsername: string, currentUsername: string) => {
  const response: ChatMessage = {
    from: currentUsername,
    message: message,
    to: targetPlayerUsername,
    date: new Date().toISOString(),
  }
  return response
}

type finishReason = "gotString" | "endedConversation"

export type TalkAIResponse = {
  type: finishReason
  finalChatMessage: string
}
export const generateAssistantResponse = async (
  system_message: string,
  aiMessages: ChatCompletionMessageParam[],
  tools: FunctionSchema[] = [],
  functionMap: { [functionName: string]: Function } = {},
): Promise<TalkAIResponse> => {
  let responseContent = ""
  let newAIMessages: ChatCompletionMessageParam[] = []
  while (true) {
    let toSubmit = [
      { role: "system", content: system_message } as ChatCompletionMessageParam,
      ...aiMessages,
      ...newAIMessages,
    ]
    console.log("To submit are", toSubmit)
    try {
      const completion =
        tools.length > 0
          ? await client.chat.completions.create({
              model: "gpt-4o-mini",
              messages: toSubmit,
              tools: tools as ChatCompletionTool[],
              tool_choice: "auto",
            })
          : await client.chat.completions.create({
              model: "gpt-4o-mini",
              messages: toSubmit,
            })

      const responseMessage = completion.choices[0].message

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        newAIMessages.push(responseMessage)

        for (const toolCall of responseMessage.tool_calls) {
          try {
            const functionName = toolCall.function.name
            const functionArgs = JSON.parse(toolCall.function.arguments)

            const functionResult: string = await executeFunction(functionName, functionMap, functionArgs)

            newAIMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: functionResult,
            })

            if (functionName === "endConversation") {
              return {
                type: "endedConversation",
                finalChatMessage: functionResult,
              }
            }
          } catch (error: any) {
            newAIMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: error.message,
            })
          }
        }
        continue
      } else if (responseMessage.content) {
        responseContent = responseMessage.content
        newAIMessages.push(responseMessage)
        return {
          type: "gotString",
          finalChatMessage: responseContent,
        }
      } else {
        break
      }
    } catch (error) {
      throw error
    }
  }
  throw new Error("we supposed to return a string content or end conversation only")
}
