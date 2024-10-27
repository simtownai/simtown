// Brain.ts
import { ConversationMemory } from "./ConversationMemory"
import { NPCConfig } from "./npcConfig"

class Memory {
  backstory: string
  conversations: ConversationMemory
  reflections: string[]

  constructor(npcConfig: NPCConfig) {
    this.backstory = npcConfig.backstory.join("/n")
    this.reflections = []
    this.conversations = new ConversationMemory()
  }
}

export { Memory }
