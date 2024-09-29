export const spriteTypes = ["orc", "soldier"] as const
export type SpriteType = (typeof spriteTypes)[number]

export interface PlayerData {
  id: string
  spriteType: SpriteType
  x: number
  y: number
  animation: string
  flipX: boolean
}

export interface UpdatePlayerData {
  x: number
  y: number
  animation: string
  flipX: boolean
}
