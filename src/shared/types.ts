export const spriteTypes = [
  "Archer",
  "Armored Axeman",
  "Armored Orc",
  "Armored Skeleton",
  "Elite Orc",
  "Knight",
  "Knight Templar",
  "Lancer",
  "Orc",
  "Orc rider",
  "Priest",
  "Skeleton",
  "Skeleton Archer",
  "Slime",
  "Soldier",
  "Swordsman",
  "Werebear",
  "Werewolf",
  "Wizard",
] as const
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

export interface ChatMessage {
  from: string
  to: string
  message: string
  date: string
}
