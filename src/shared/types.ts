import { z } from "zod"

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

/*
 *
 * Actions
 *
 */

export const MoveToCoordinatesSchema = z.object({
  type: z.literal("movetocoordinates"),
  target: z.object({
    targetType: z.literal("coordinates"),
    x: z.number(),
    y: z.number(),
  }),
})
export const MoveToPersonSchema = z.object({
  type: z.literal("movetoperson"),
  target: z.object({
    targetType: z.literal("person"),
    name: z.string(),
  }),
})
export const MoveToPlaceSchema = z.object({
  type: z.literal("movetoplace"),
  target: z.object({
    targetType: z.literal("place"),
    name: z.string(),
  }),
})
const MoveTarget = z.discriminatedUnion("targetType", [
  MoveToCoordinatesSchema.shape.target,
  MoveToPersonSchema.shape.target,
  MoveToPlaceSchema.shape.target,
])
export type MoveTarget = z.infer<typeof MoveTarget>

export const TalkSchema = z.object({
  type: z.literal("talk"),
  name: z.string(),
})

const IdleActivityTypeSchema = z.enum(["idle", "read"])
export type IdleActivityType = z.infer<typeof IdleActivityTypeSchema>
export const IdleSchema = z.object({
  type: z.literal("idle"),
  activityType: IdleActivityTypeSchema,
})

export const BroadcastSchema = z.object({
  type: z.literal("broadcast"),
  targetPlace: z.string(),
})

export const ListenSchema = z.object({
  type: z.literal("listen"),
  targetPlace: z.string(),
})

export const availableVoteCandidates = ["Donald", "Kamala"] as const
export const VoteCandidateSchema = z.enum(availableVoteCandidates)
export type VoteCandidate = z.infer<typeof VoteCandidateSchema>
export const VoteSchema = z.object({
  type: z.literal("vote"),
})

export const allActionSchemas = [
  MoveToPersonSchema,
  MoveToPlaceSchema,
  MoveToCoordinatesSchema,
  TalkSchema,
  IdleSchema,
  BroadcastSchema,
  ListenSchema,
  VoteSchema,
] as const
export type AvailableActionSchema = (typeof allActionSchemas)[number]
export type ActionType = (typeof allActionSchemas)[number]["shape"]["type"]["value"]

const AIActionSchema = z.discriminatedUnion("type", [
  MoveToCoordinatesSchema,
  MoveToPlaceSchema,
  MoveToPersonSchema,
  TalkSchema,
  IdleSchema,
  BroadcastSchema,
  ListenSchema,
  VoteSchema,
])
export const AIActionPlanSchema = z.array(AIActionSchema)
export type AIAction = z.infer<typeof AIActionSchema>
export type AIActionPlan = z.infer<typeof AIActionPlanSchema>

/*
 *
 * Map
 *
 */

export type MapData = {
  compressionlevel: number
  height: number
  infinite: boolean
  layers: Layer[]
  nextlayerid: number
  nextobjectid: number
  orientation: string
  renderorder: string
  tiledversion: string
  tileheight: number
  tilesets: Tileset[]
  tilewidth: number
  type: string
  version: string
  width: number
}

export type Layer = {
  data?: number[]
  height?: number
  id: number
  name: string
  opacity: number
  type: Type
  visible: boolean
  width?: number
  x: number
  y: number
  draworder?: string
  objects?: Object[]
}

export type Object = {
  height: number
  id: number
  name: string
  rotation: number
  type: string
  visible: boolean
  width: number
  x: number
  y: number
}

enum Type {
  Objectgroup = "objectgroup",
  Tilelayer = "tilelayer",
}

type Tileset = {
  columns: number
  firstgid: number
  image: string
  imageheight: number
  imagewidth: number
  margin: number
  name: string
  spacing: number
  tilecount: number
  tileheight: number
  tilewidth: number
}
