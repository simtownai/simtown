// Brain.ts
import { ConversationMemory } from "./ConversationMemory"
import { NpcConfig } from "./npcConfig"

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

const generatePlanForTheday = (npcConfig: NpcConfig): PlanAction[] => {
  if (npcConfig.id === "1") {
    return [{ action: { type: "talk", name: "player1" }, duration: 30, start: new Date() }]
  } else {
    return [{ action: { type: "idle" }, duration: 30, start: new Date() }]
  }
  // TODO implement this using openai and strcutured output
  // const completion = await client.chat.completions.create({
  //   model: "gpt-4o-mini",
  //   messages: [
  //     { role: "system", content: `You are an NPC with a backstory of ${backstory}. Generate a plan for the day.` },
  //   ],
  //   response_format: { type: "json_object" },
  // })
  // return completion.choices[0].message.content
}

class Memory {
  backstory: string
  observationState: Observation[]
  reflectionState: Reflection[]
  planForTheDay: PlanAction[]
  conversations: ConversationMemory

  constructor(npcConfig: NpcConfig) {
    this.backstory = npcConfig.backstory.join("/n")
    this.observationState = []
    this.reflectionState = []
    this.planForTheDay = generatePlanForTheday(npcConfig)
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
