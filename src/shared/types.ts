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
