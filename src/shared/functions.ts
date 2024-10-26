import componentManifest from "../../public/assets/sprites/Character_Generator/componentManifest.json"
import { CONFIG } from "./config"
import { PlayerData, PlayerSpriteDefinition } from "./types"

const currentDate = new Date()
const realTimeDifferenceMs = CONFIG.TARGET_DATE.getTime() - currentDate.getTime()
const startDateMs = CONFIG.TARGET_DATE.getTime() - realTimeDifferenceMs / 60

// Time calculation function
export function getTime(): Date {
  const currentDate = new Date()

  const timeDifferenceMs = currentDate.getTime() - startDateMs

  // Scale the difference by 60 for in-game time progression
  const gameTimeDifferenceMs = timeDifferenceMs * 60

  // Calculate and return the in-game date
  const inGameDate = new Date(startDateMs + gameTimeDifferenceMs)
  return inGameDate
}

export function isWithinListenThreshold(playerData: PlayerData, x: number, y: number): boolean {
  const dx = playerData.x - x
  const dy = playerData.y - y
  const distance = Math.sqrt(dx * dx + dy * dy)
  return distance <= CONFIG.LISTEN_THRESHOLD
}

export function createRandomSpriteDefinition(): PlayerSpriteDefinition {
  const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

  const spriteDefinition: PlayerSpriteDefinition = {
    body: randomElement(componentManifest.Bodies) as PlayerSpriteDefinition["body"],
    eyes: randomElement(componentManifest.Eyes) as PlayerSpriteDefinition["eyes"],
    outfit: randomElement(componentManifest.Outfits) as PlayerSpriteDefinition["outfit"],
    hairstyle: randomElement(componentManifest.Hairstyles) as PlayerSpriteDefinition["hairstyle"],
  }

  if (Math.random() < 0.5) {
    spriteDefinition.accessory = randomElement(componentManifest.Accessories) as PlayerSpriteDefinition["accessory"]
  }

  return spriteDefinition
}
