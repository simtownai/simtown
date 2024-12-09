import { ConversationMemory } from "./ConversationMemory"

class Memory {
  backstory: string
  conversations: ConversationMemory
  reflections: string[]

  constructor(backstory: string[]) {
    this.backstory = backstory.join("/n")
    this.reflections = []
    this.conversations = new ConversationMemory()
  }
}

export { Memory }
