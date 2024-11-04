import logger from "../../../shared/logger"
import { ChatMessage } from "../../../shared/types"
import { ChatCompletionMessageParam } from "openai/resources/index.mjs"

export const mapChatMessageToChatAIMessage = (
  current_player: string,
  message: ChatMessage,
): ChatCompletionMessageParam => {
  return {
    role: current_player === message.from ? "assistant" : "user",
    content: message.message,
  }
}

export const mapChatMessagesToAIMessages = (
  current_player: string,
  messages: ChatMessage[],
): ChatCompletionMessageParam[] => {
  return messages.reduce((acc: ChatCompletionMessageParam[], message) => {
    const role = current_player === message.from ? "assistant" : "user"
    const lastMessage = acc[acc.length - 1]

    if (lastMessage && lastMessage.role === role) {
      // Append to existing message
      lastMessage.content += "\n" + message.message
      return acc
    }

    // Add new message
    return [...acc, { role, content: message.message }]
  }, [])
}

export class Thread {
  messages: ChatMessage[]
  finished: boolean
  constructor() {
    this.messages = []
    this.finished = false
  }
}

export class ConversationMemory {
  threads: Map<string, Thread[]>

  constructor() {
    this.threads = new Map()
  }

  getLatestThread(targetPlayerId: string): Thread {
    const threads = this.threads.get(targetPlayerId)
    return threads![threads!.length - 1]
  }

  isLatestThreadActive(targetPlayerId: string): boolean {
    const threads = this.threads.get(targetPlayerId)
    if (!threads) {
      return false
    }
    return !threads[threads.length - 1].finished
  }

  addChatMessage(targetPlayerUsername: string, message: ChatMessage) {
    const thread = this.getNewestActiveThread(targetPlayerUsername)

    thread.messages.push(message)
  }

  closeThread(targetPlayerUsername: string) {
    const threads = this.threads.get(targetPlayerUsername)
    if (!threads) {
      logger.error("No thread for this id, we should not  be closing it")
      return
      // throw Error("No thread for this id, we should not  be closing it")
    }
    threads[threads.length - 1].finished = true
  }

  getNewestActiveThread(targetPlayerUsername: string): Thread {
    //   this function returns the newest thread that is not finished, otherwise it returns a new thread
    const threads = this.threads.get(targetPlayerUsername)

    if (!threads) {
      // if no threads exist, we initialize new one
      this.threads.set(targetPlayerUsername, [new Thread()])
    }
    //   now we need to check if the newest thread is finished
    const newestThread = this.threads.get(targetPlayerUsername)![this.threads.get(targetPlayerUsername)!.length - 1]
    const isFinished = newestThread.finished
    if (isFinished) {
      // if it is finished, we need to create a new thread
      this.threads.get(targetPlayerUsername)!.push(new Thread())
    }
    //   now we need to return the newest thread
    return this.threads.get(targetPlayerUsername)![this.threads.get(targetPlayerUsername)!.length - 1]
  }
}
