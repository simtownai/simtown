import { ChatMessage } from "../shared/types"
import { ChatCompletionMessageParam } from "openai/resources/index.mjs"

class Thread {
  messages: ChatMessage[]
  aiMessages: ChatCompletionMessageParam[]
  finished: boolean
  constructor() {
    this.messages = []
    this.aiMessages = []
    this.finished = false
  }
}

export class ConversationMemory {
  threads: Map<string, Thread[]>

  constructor() {
    this.threads = new Map()
  }

  isLatestThreadActive(targetPlayerId: string): boolean {
    const threads = this.threads.get(targetPlayerId)
    if (!threads) {
      return false
    }
    return !threads[threads.length - 1].finished
  }

  addAIMessage(targetPlayerId: string, message: ChatCompletionMessageParam) {
    const thread = this.getNewestActiveThread(targetPlayerId)
    thread.aiMessages.push(message)
  }

  addChatMessage(targetPlayerId: string, message: ChatMessage) {
    const thread = this.getNewestActiveThread(targetPlayerId)

    thread.messages.push(message)
  }

  closeThread(targetPlayerId: string) {
    const threads = this.threads.get(targetPlayerId)
    if (!threads) {
      throw Error("No thread for this id, we should not  be closing it")
    }
    threads[threads.length - 1].finished = true
  }

  getNewestActiveThread(targetPlayerId: string): Thread {
    //   this function returns the newest thread that is not finished, otherwise it returns a new thread
    const threads = this.threads.get(targetPlayerId)

    if (!threads) {
      // if no threads exist, we initialize new one
      this.threads.set(targetPlayerId, [new Thread()])
    }
    //   now we need to check if the newest thread is finished
    const newestThread = this.threads.get(targetPlayerId)![this.threads.get(targetPlayerId)!.length - 1]
    const isFinished = newestThread.finished
    if (isFinished) {
      // if it is finished, we need to create a new thread
      this.threads.get(targetPlayerId)!.push(new Thread())
    }
    //   now we need to return the newest thread
    return this.threads.get(targetPlayerId)![this.threads.get(targetPlayerId)!.length - 1]
  }
}
