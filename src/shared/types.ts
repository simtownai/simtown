import { z } from "zod"

export type PlayerSpriteDefinition = {
  body: "Body_01" | "Body_02" | "Body_03" | "Body_04" | "Body_05" | "Body_06" | "Body_07" | "Body_08" | "Body_09"
  eyes: "Eyes_01" | "Eyes_02" | "Eyes_03" | "Eyes_04" | "Eyes_05" | "Eyes_06" | "Eyes_07"
  outfit: `Outfit_${number}_${number}`
  hairstyle: `Hairstyle_${number}_${number}`
  accessory?: `Accessory_${number}_${string}_${number}`
  book?: "Book_01" | "Book_02" | "Book_03" | "Book_04" | "Book_05" | "Book_06"
}

export interface PlayerData {
  id: string
  isNPC: boolean
  username: string
  spriteDefinition: PlayerSpriteDefinition
  x: number
  y: number
  animation: string
  action?: GeneratedAction
}

export interface UpdatePlayerData {
  x?: number
  y?: number
  animation?: string
  action?: GeneratedAction
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
const MoveTargetSchema = z.discriminatedUnion("targetType", [
  MoveToCoordinatesTargetSchema,
  MoveToPersonTargetSchema,
  MoveToPlaceTargetSchema,
])
export type MoveTarget = z.infer<typeof MoveTargetSchema>
const MoveSchema = z.object({
  type: z.literal("move"),
  target: MoveTargetSchema,
})

const TalkSchema = z.object({
  type: z.literal("talk"),
  name: z.string(),
})

const IdleActivityTypeSchema = z.enum(["phone", "reading", "idling"])

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

const ActionSchema = z.discriminatedUnion("type", [MoveSchema, TalkSchema, IdleSchema, BroadcastSchema, ListenSchema])
export type GeneratedAction = z.infer<typeof ActionSchema>

export const ActionPlanSchema = z.array(ActionSchema)
export type GeneratedActionPlan = z.infer<typeof ActionPlanSchema>
