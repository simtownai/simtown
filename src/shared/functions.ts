import componentManifest from "../../public/assets/sprites/Character_Generator/componentManifest.json"
import { CONFIG } from "./config"
import { AIAction, GridPosition, PlayerSpriteDefinition } from "./types"

export const get_move_message = (username: string) => `Hey ${username}, you're blocking my path.`

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

export function getGameTime(): Date {
  const currentDate = new Date()
  const timeDifferenceMs = currentDate.getTime() - startDateMs
  const gameTimeDifferenceMs = timeDifferenceMs * 60
  const inGameDate = new Date(startDateMs + gameTimeDifferenceMs)
  return inGameDate
}

export function getDaysRemaining(): number {
  const now = getGameTime()
  const diffTime = CONFIG.TARGET_DATE.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function formatDate(date: Date) {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const dayInMs = 24 * 60 * 60 * 1000
  const weekInMs = 7 * dayInMs
  if (diff < dayInMs) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  } else if (diff < weekInMs) {
    return date.toLocaleDateString("en-US", { weekday: "short" })
  } else {
    return date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })
  }
}

export function getDirection(deltaX: number, deltaY: number): "left" | "right" | "up" | "down" {
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Horizontal movement
    return deltaX > 0 ? "right" : "left"
  } else {
    // Vertical movement
    return deltaY > 0 ? "down" : "up"
  }
}

export function formatTimeAMPM(date: Date) {
  let hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? "PM" : "AM"
  hours = hours % 12
  hours = hours ? hours : 12 // Convert 0 to 12
  const minutesStr = minutes < 10 ? "0" + minutes : minutes
  return `${hours}:${minutesStr} ${ampm}`
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
  spriteDefinition.book = randomElement(componentManifest.Books) as PlayerSpriteDefinition["book"]

  return spriteDefinition
}

export function getBroadcastAnnouncementsKey(targetPlace: string, username: string): string {
  return `${targetPlace}-${username}`
}

export function getTextFromAction(action: AIAction | undefined, verbose: boolean = true): string {
  if (!action) return ""
  switch (action.type) {
    case "movetocoordinates":
    case "movetoperson":
    case "movetoplace":
      let emoji = "🚶"
      if (action.target.targetType === "coordinates") {
        return emoji + `📍${action.target.x},${action.target.y}`
      } else if (action.target.targetType === "person") {
        return emoji + `👤${action.target.name}`
      } else if (action.target.targetType === "place") {
        return emoji + `🏠${action.target.name}`
      } else {
        return emoji
      }
    case "talk":
      return `💬${verbose ? action.name : ""}`
    case "idle":
      if (action.activityType === "read") {
        return `📖`
        // } else if (action.activityType === "phone") {
        //   return `📱📱📱`
      } else {
        return `😴`
      }
    case "broadcast":
      return `📢${verbose ? action.targetPlace : ""}`
    case "listen":
      return `👂${verbose ? action.targetPlace : ""}`
    case "vote":
      return `🗳️`
    default:
      return ""
  }
}
