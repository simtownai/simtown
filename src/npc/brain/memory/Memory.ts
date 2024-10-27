// Brain.ts
import { NpcConfig } from "../../npcConfig"
import { ConversationMemory } from "./ConversationMemory"

class Memory {
  backstory: string
  conversations: ConversationMemory
  reflections: string[]

  constructor(npcConfig: NpcConfig) {
    this.backstory = npcConfig.backstory.join("/n")
    this.reflections = []
    this.conversations = new ConversationMemory()
  }
}

export { Memory }
