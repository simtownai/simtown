import logger from "../shared/logger"
import { BrainDump } from "./brain/AIBrain"

export const log_threads = (aiBrainDumop: BrainDump) => {
  const conversations = aiBrainDumop.conversations.threads
  logger.error(`(${aiBrainDumop.playerData.username})`)
  for (const conversation of conversations) {
    const playerName = conversation[0]
    console.error(`Threads with ${playerName}`)
    const threadMeat = conversation[1]
    for (const thread of threadMeat) {
      console.error("Finished", thread.finished)
      console.error("AI messages", thread.aiMessages)
      console.error("Chat messages", thread.messages)
    }
  }
}
