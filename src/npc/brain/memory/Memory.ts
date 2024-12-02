import { NPCConfig } from "../../../shared/types"
import { ConversationMemory } from "./ConversationMemory"

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
