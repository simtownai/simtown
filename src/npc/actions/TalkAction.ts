import { ChatMessage } from "../../shared/types"
import { FunctionSchema, functionToSchema } from "../aihelper"
import { NPC } from "../client"
import { ConversationTimeoutThreshold } from "../npcConfig"
import client from "../openai"
import { Action } from "./Action"
import { MoveAction } from "./MoveAction"
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/index.mjs"
import { z } from "zod"

type TalkActionState = "moving" | "talking"

type ExistingConversationType = { type: "existing"; message: ChatMessage }
type NewConversationType = { type: "new" }
export type ConversationType = ExistingConversationType | NewConversationType

export class TalkAction extends Action {
  private targetPlayerUsername: string
  private state: TalkActionState
  private targetPosition: { x: number; y: number } | null = null
  private moveAction: MoveAction | null = null
  private conversationTimeout: NodeJS.Timeout | null = null
  tools: FunctionSchema[]
  functionMap: { [functionName: string]: Function }
  conversationType: ConversationType

  constructor(
    npc: NPC,
    targetPlayerUsername: string,
    tools: FunctionSchema[],
    functionMap: { [functionName: string]: Function },
    conversationType: ConversationType,
  ) {
    super(npc)
    this.tools = [this.endConversationTool, ...tools]
    this.functionMap = {
      ...functionMap,
      endConversation: (args: { reason: string }) => this.endConversation(args.reason),
    }
    console.log("WE ARE IN CONSTRUCTOR,target username is ", targetPlayerUsername)
    this.targetPlayerUsername = targetPlayerUsername
    this.conversationType = conversationType
    this.state = this.conversationType.type === "new" ? "moving" : "talking"
  }
  endConversation(reason: string) {
    console.log("Ending conversation with reason", reason)
    this.isCompletedFlag = true
    return reason
  }

  async startConversation(targetPlayerUsername: string) {
    this.npc.aiBrain.memory.conversations.getNewestActiveThread(targetPlayerUsername)
    this.clearConversationTimeout()

    const system_message = `You are an NPC with a backstory of ${this.npc.aiBrain.memory.backstory}. Generate a conversation starter with another player.`

    const responseContent = await this.generateAssistantResponse(system_message, targetPlayerUsername)

    if (this.npc.aiBrain.memory.conversations.isLatestThreadActive(targetPlayerUsername)) {
      const response = this.handleFinalChatResponse(responseContent, targetPlayerUsername)
      this.npc.socket.emit("sendMessage", response)
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
      from: this.npc.playerData.username,
      message: responseContent,
      to: targetPlayerUsername,
      date: new Date().toISOString(),
    }
    this.npc.aiBrain.memory.conversations.addChatMessage(targetPlayerUsername, response)

    return response
  }

  async generateAssistantResponse(system_message: string, targetPlayerUsername: string): Promise<string> {
    let responseContent = ""
    while (true) {
      const toSubmit = [
        { role: "system", content: system_message } as ChatCompletionMessageParam,
        ...this.npc.aiBrain.memory.conversations.getNewestActiveThread(targetPlayerUsername).aiMessages,
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
          for (const toolCall of responseMessage.tool_calls) {
            this.npc.aiBrain.memory.conversations.addAIMessage(targetPlayerUsername, responseMessage)

            const functionName = toolCall.function.name
            const functionArgs = JSON.parse(toolCall.function.arguments)
            const functionResult = await this.executeFunction(functionName, functionArgs)

            if (!functionResult) {
              throw new Error(`Function ${functionName} returned undefined`)
            }

            this.npc.aiBrain.memory.conversations.addAIMessage(targetPlayerUsername, {
              role: "tool",
              tool_call_id: toolCall.id,
              content: functionResult,
            })

            if (functionName === "endConversation") {
              this.clearConversationTimeout()
              const response = this.handleFinalChatResponse(functionResult, targetPlayerUsername)
              this.npc.socket.emit("endConversation", response)
              this.npc.aiBrain.memory.conversations.closeThread(targetPlayerUsername)
              return ""
            }
          }
          continue
        } else if (responseMessage.content) {
          responseContent = responseMessage.content
          this.npc.aiBrain.memory.conversations.addAIMessage(targetPlayerUsername, responseMessage)
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

  async handleMessage(chatMessage: ChatMessage) {
    this.clearConversationTimeout()
    this.setConversationTimeout(chatMessage.from)

    this.npc.aiBrain.memory.conversations.addChatMessage(chatMessage.from, chatMessage)
    this.npc.aiBrain.memory.conversations.addAIMessage(chatMessage.from, { role: "user", content: chatMessage.message })

    const system_message = `You are an NPC with a backstory of ${this.npc.aiBrain.memory.backstory}.`

    const responseContent = await this.generateAssistantResponse(system_message, chatMessage.from)

    if (this.npc.aiBrain.memory.conversations.isLatestThreadActive(chatMessage.from)) {
      const response = this.handleFinalChatResponse(responseContent, chatMessage.from)
      this.npc.socket.emit("sendMessage", response)
    }
  }

  private async executeFunction(functionName: string, args: any): Promise<any> {
    const func = this.functionMap[functionName]
    if (func) {
      return await func(args)
    } else {
      throw new Error(`Unknown function: ${functionName}`)
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
    this.npc.aiBrain.memory.conversations.closeThread(targetPlayerUsername)
    this.npc.socket.emit("endConversation", response)
    this.isCompletedFlag = true
  }

  async start() {
    this.isStarted = true
    console.log("Starting talk action with state", this.state)

    if (this.conversationType.type === "new") {
      // Proceed with moving and starting a new conversation
      const playerPosition = this.npc.getPlayerPosition(this.targetPlayerUsername)

      if (playerPosition) {
        this.targetPosition = {
          x: playerPosition.x,
          y: playerPosition.y,
        }

        this.moveAction = new MoveAction(this.npc, this.targetPosition)
        await this.moveAction.start()
      } else {
        console.warn(`Player with ID ${this.targetPlayerUsername} not found.`)
        this.isCompletedFlag = true // Can't find player, mark action as completed
      }
    } else {
      // Handle the message immediately
      await this.handleMessage(this.conversationType.message)
    }
  }

  async update(deltaTime: number) {
    if (this.isInterrupted || !this.isStarted) return

    switch (this.state) {
      case "moving":
        if (this.moveAction) {
          this.moveAction.update(deltaTime)

          // Check if the movement is completed
          if (this.moveAction.isCompleted()) {
            console.log("target username is ", this.targetPlayerUsername)
            this.startConversation(this.targetPlayerUsername)
            this.state = "talking"
          }
        }
        break

      case "talking":
        if (!this.npc.aiBrain.memory.conversations.isLatestThreadActive(this.targetPlayerUsername)) {
          console.log("Conversation completed.")
          this.isCompletedFlag = true
        }
        break
    }
  }

  interrupt(): void {
    super.interrupt()
    if (this.moveAction) this.moveAction.interrupt()

    // Optionally, handle conversation interruption
    if (this.state === "talking") {
      console.log("Interruptiong talking action")
      // to do: implement talking interruption
    }
  }

  resume(): void {
    super.resume()
    if (this.moveAction) this.moveAction.resume()

    // Optionally, handle conversation resumption
    if (this.state === "talking") {
      // Implement logic to resume conversation if needed
    }
  }
}
