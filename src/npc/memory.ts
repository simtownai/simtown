// Brain.ts
import { ConversationMemory } from "./ConversationMemory"
import { NpcConfig } from "./npcConfig"

export type EventType = "talking" | "walking" | "listening" | "broadcasting" | "moving" | "idle"

interface Reflection {
  event: EventType
  details: string
  timestamp: Date
}

interface Observation {
  details: string
  timestamp: Date
}

class Memory {
  backstory: string
  observationState: Observation[]
  reflectionState: Reflection[]
  conversations: ConversationMemory

  constructor(npcConfig: NpcConfig) {
    this.backstory = npcConfig.backstory.join("/n")
    this.observationState = []
    this.reflectionState = []
    this.conversations = new ConversationMemory()
  }

  addObservation(observation: Observation) {
    this.observationState.push(observation)
  }
}

export { Memory }
