// Brain.ts
import { ConversationMemory } from "./ConversationMemory"

export type EventType = "talking" | "walking" | "listening" | "broadcasting" | "moving" | "idle"

type Move = { type: "move"; target: string }

type Talk = { type: "talk"; name: string }

type Broadcast = { type: "broadcast"; place: string }

type Listen = { type: "listen"; place: string }

type Media = "Fox" | "NYT"

type Consume = { type: "consume"; media: Media }

type Idle = { type: "idle" }

export type Action = Move | Talk | Listen | Consume | Idle | Broadcast

interface Reflection {
  event: EventType
  details: string
  timestamp: Date
}

interface Observation {
  details: string
  timestamp: Date
}

export interface PlanAction {
  duration: number
  start: Date
  action: Action
}

class Memory {
  backstory: string
  observationState: Observation[]
  reflectionState: Reflection[]
  planForTheDay: PlanAction[]
  conversations: ConversationMemory

  constructor(backstory: string) {
    this.backstory = backstory
    this.observationState = []
    this.reflectionState = []
    this.planForTheDay = [{ action: { type: "talk", name: "player1" }, duration: 30, start: new Date() }]
    this.conversations = new ConversationMemory()
  }

  addObservation(observation: Observation) {
    this.observationState.push(observation)
  }

  addToPlan(action: PlanAction) {
    this.planForTheDay.push(action)
  }
}

export { Memory }
