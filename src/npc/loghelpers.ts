import logger from "../shared/logger"
import { BrainDump } from "./brain/AIBrain"

export const log_threads = (aiBrainDumop: BrainDump) => {
  const conversations = aiBrainDumop.conversations.threads
  logger.debug(`(${aiBrainDumop.playerData.username})`)
  for (const conversation of conversations) {
    const playerName = conversation[0]
    console.debug(`Threads with ${playerName}`)
    const threadMeat = conversation[1]
    for (const thread of threadMeat) {
      console.debug("Finished", thread.finished)
      console.debug("AI messages", thread.aiMessages)
      console.debug("Chat messages", thread.messages)
    }
  }
}
