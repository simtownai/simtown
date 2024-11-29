import { z } from "zod"

export const availableGames = ["electiontown", "scavengerhunt", "characterai", "murderdrones"] as const

export type AvailableGames = (typeof availableGames)[number]

export type PlayerSpriteDefinition = {
  body: "Body_01" | "Body_02" | "Body_03" | "Body_04" | "Body_05" | "Body_06" | "Body_07" | "Body_08" | "Body_09"
  eyes: "Eyes_01" | "Eyes_02" | "Eyes_03" | "Eyes_04" | "Eyes_05" | "Eyes_06" | "Eyes_07"
  outfit: `Outfit_${number}_${number}`
  hairstyle: `Hairstyle_${number}_${number}`
  accessory?: `Accessory_${number}_${string}_${number}` | `Accessory_${number}_${string}_${string}_${number}`
  book?: "Book_01" | "Book_02" | "Book_03" | "Book_04" | "Book_05" | "Book_06"
}

export interface NPCState {
  backstory: string[]
  reflections: string[]
  plan: AIActionPlan
}

export interface PlayerData {
  id: string
  isNPC: boolean
  username: string
  spriteDefinition: PlayerSpriteDefinition
  x: number
  y: number
  animation: string
  action?: AIAction
  npcState?: Partial<NPCState>
}

export interface UpdatePlayerData {
  x?: number
  y?: number
  animation?: string
  action?: AIAction
  npcState?: Partial<NPCState>
}

export interface ChatMessage {
  from: string
  to: string
  message: string
  date: string
  isRead?: boolean
}

export interface BroadcastMessage {
  from: string
  message: string
  place: string
  date: string
}

export type GridPosition = { gridX: number; gridY: number }

export type NewsItem = {
  date: string
  message: string
  place?: string
  isRead?: boolean
}

const MoveToCoordinatesTargetSchema = z.object({
  targetType: z.literal("coordinates"),
  x: z.number(),
  y: z.number(),
})
const MoveToPersonTargetSchema = z.object({
  targetType: z.literal("person"),
  name: z.string(),
})
const MoveToPlaceTargetSchema = z.object({
  targetType: z.literal("place"),
  name: z.string(),
})
export type MoveTargetPlace = z.infer<typeof MoveToPlaceTargetSchema>

const MoveTargetWithPerson = z.discriminatedUnion("targetType", [
  MoveToCoordinatesTargetSchema,
  MoveToPersonTargetSchema,
  MoveToPlaceTargetSchema,
])
export type MoveTarget = z.infer<typeof MoveTargetWithPerson>

const MoveTargetSchemaNoPerson = z.discriminatedUnion("targetType", [
  MoveToCoordinatesTargetSchema,
  MoveToPlaceTargetSchema,
])

const MoveSchema = z.object({
  type: z.literal("move"),
  target: MoveTargetSchemaNoPerson,
})

const MoveSchemaWithPerson = z.object({
  type: z.literal("move"),
  target: MoveTargetWithPerson,
})

const TalkSchema = z.object({
  type: z.literal("talk"),
  name: z.string(),
})

const IdleActivityTypeSchema = z.enum(["idle", "read"])
export type IdleActivityType = z.infer<typeof IdleActivityTypeSchema>

const IdleSchema = z.object({
  type: z.literal("idle"),
  activityType: IdleActivityTypeSchema,
})
const BroadcastSchema = z.object({
  type: z.literal("broadcast"),
  targetPlace: z.string(),
})

const ListenSchema = z.object({
  type: z.literal("listen"),
  targetPlace: z.string(),
})

export const availableVoteCandidates = ["Donald", "Kamala"] as const
export const VoteCandidateSchema = z.enum(availableVoteCandidates)
export type VoteCandidate = z.infer<typeof VoteCandidateSchema>

const VoteSchema = z.object({
  type: z.literal("vote"),
})

const AIActionSchema = z.discriminatedUnion("type", [
  MoveSchema,
  TalkSchema,
  IdleSchema,
  BroadcastSchema,
  ListenSchema,
  VoteSchema,
])
export const AIActionPlanSchema = z.array(AIActionSchema)
export type AIAction = z.infer<typeof AIActionSchema>
export type AIActionPlan = z.infer<typeof AIActionPlanSchema>

const FullActionSchema = z.discriminatedUnion("type", [
  MoveSchemaWithPerson,
  TalkSchema,
  IdleSchema,
  BroadcastSchema,
  ListenSchema,
  VoteSchema,
])
export type FullAction = z.infer<typeof FullActionSchema>
