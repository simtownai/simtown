import { z } from "zod"

export type PlayerSpriteDefinition = {
  body: "Body_01" | "Body_02" | "Body_03" | "Body_04" | "Body_05" | "Body_06" | "Body_07" | "Body_08" | "Body_09"
  eyes: "Eyes_01" | "Eyes_02" | "Eyes_03" | "Eyes_04" | "Eyes_05" | "Eyes_06" | "Eyes_07"
  outfit: `Outfit_${number}_${number}`
  hairstyle: `Hairstyle_${number}_${number}`
  accessory?: `Accessory_${number}_${string}_${number}`
}

export interface PlayerData {
  id: string
  username: string
  spriteDefinition: PlayerSpriteDefinition
  x: number
  y: number
  animation: string
  action?: Action
}

export interface UpdatePlayerData {
  x?: number
  y?: number
  animation?: string
  action?: Action
}

export interface ChatMessage {
  from: string
  to: string
  message: string
  date: string
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

const IdleSchema = z.object({
  type: z.literal("idle"),
})

const ActionSchema = z.discriminatedUnion("type", [MoveSchema, TalkSchema, IdleSchema])
export type Action = z.infer<typeof ActionSchema>

export const ActionPlanSchema = z.array(ActionSchema)
export type ActionPlan = z.infer<typeof ActionPlanSchema>
