import componentManifest from "../../public/assets/sprites/Character_Generator/componentManifest.json"
import { CONFIG } from "./config"
import { GridPosition, PlayerSpriteDefinition } from "./types"

export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

export function worldToGrid(x: number, y: number): GridPosition {
  return {
    gridX: Math.floor((x - 1) / CONFIG.TILE_SIZE),
    gridY: Math.floor((y - 1) / CONFIG.TILE_SIZE),
  }
}

export function gridToWorld(cell: GridPosition): { x: number; y: number } {
  return {
    x: cell.gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
    y: cell.gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE,
  }
}

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

export function isInZone(
  playerX: number,
  playerY: number,
  zoneX: number,
  zoneY: number,
  zoneWidth: number,
  zoneHeight: number,
): boolean {
  return playerX >= zoneX && playerX <= zoneX + zoneWidth && playerY >= zoneY && playerY <= zoneY + zoneHeight
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
