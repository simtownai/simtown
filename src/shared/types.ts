export interface PlayerData {
  id: string
  spriteIndex: number
  x: number
  y: number
  animation: string
  lastFrame: string
}

export type UpdatePlayerData = Partial<PlayerData> & { id: string }
