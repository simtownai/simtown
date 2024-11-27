import { NPC } from "../npc/client"
import { npcConfig, npcConfigCharacterAI } from "../npc/npcConfig"
import { scavengerhuntPromptSystem, simtownPromptSystem } from "../npc/prompts"
import { CONFIG } from "../shared/config"
import { gridToWorld, worldToGrid } from "../shared/functions"
import logger from "../shared/logger"
import {
  GridPosition,
  NewsItem,
  PlayerData,
  PlayerSpriteDefinition,
  UpdatePlayerData,
  VoteCandidate,
} from "../shared/types"

export abstract class Room {
  protected id: string
  protected name: string
  protected instanceType: "shared" | "private"
  protected players: Map<string, PlayerData>
  protected npcs: NPC[]
  protected created: Date
  protected newsPaper: NewsItem[]
  protected voteResults: Map<string, VoteCandidate>[]
  protected places: (typeof CONFIG.MAP_DATA.layers)[0]["objects"]
  protected spawnArea: NonNullable<NonNullable<(typeof CONFIG.MAP_DATA.layers)[0]["objects"]>[0]>

  constructor(id: string, name: string, instanceType: "shared" | "private") {
    this.id = id
    this.name = name
    this.instanceType = instanceType
    this.players = new Map()
    this.npcs = []
    this.created = new Date()
    this.newsPaper = []
    this.voteResults = [new Map()]
    this.places = CONFIG.MAP_DATA.layers.find((layer) => layer.name === CONFIG.PLACES_LAYER_NAME)!.objects!
    this.spawnArea = this.places.find((obj) => obj.name === CONFIG.SPAWN_PLACE_NAME)!
  }

  abstract initialize(): void

  getInstanceType(): "shared" | "private" {
    return this.instanceType
  }

  getId(): string {
    return this.id
  }

  getName(): string {
    return this.name
  }

  getRealPlayerCount(): number {
    return Array.from(this.players.values()).filter((player) => !player.isNPC).length
  }

  getPlayerCount(): number {
    return this.players.size
  }

  getPlayers(): Map<string, PlayerData> {
    return this.players
  }

  getPlaces(): (typeof CONFIG.MAP_DATA.layers)[0]["objects"] {
    return this.places
  }

  getCreationDate(): Date {
    return this.created
  }

  addPlayer(
    playerId: string,
    isNPC: boolean,
    username: string,
    spriteDefinition: PlayerSpriteDefinition,
    position: { x: number; y: number },
  ): PlayerData {
    const playerData: PlayerData = {
      id: playerId,
      isNPC,
      username,
      spriteDefinition,
      x: position.x,
      y: position.y,
      animation: `${username}-idle-down`,
    }

    this.players.set(playerId, playerData)
    return playerData
  }

  removePlayer(playerId: string): PlayerData | undefined {
    const player = this.players.get(playerId)
    this.players.delete(playerId)
    return player
  }

  getPlayer(playerId: string): PlayerData | undefined {
    return this.players.get(playerId)
  }

  updatePlayerData(playerId: string, playerData: UpdatePlayerData): PlayerData | undefined {
    const player = this.players.get(playerId)
    if (!player) return
    let updatedPlayer = { ...player, ...playerData }
    this.players.set(playerId, updatedPlayer)
    return updatedPlayer
  }

  getNewsPaper(): NewsItem[] {
    return this.newsPaper
  }

  addNewsItem(newsItem: NewsItem) {
    this.newsPaper.push(newsItem)
  }

  getVoteResults(): Map<string, VoteCandidate>[] {
    return this.voteResults
  }

  finishVoting() {
    this.voteResults.push(new Map())
  }

  isCellBlocked(cell: GridPosition): boolean {
    for (const player of this.players.values()) {
      const playerGridPos = worldToGrid(player.x, player.y)
      if (playerGridPos.gridX === cell.gridX && playerGridPos.gridY === cell.gridY) {
        return true
      }
    }
    return false
  }

  findValidPosition(): { x: number; y: number } {
    const availablePositions: GridPosition[] = []

    const minGridPos = worldToGrid(this.spawnArea.x + 1, this.spawnArea.y + 1)
    const maxGridPos = worldToGrid(this.spawnArea.x + this.spawnArea.width, this.spawnArea.y + this.spawnArea.height)

    for (let y = minGridPos.gridY; y <= maxGridPos.gridY; y++) {
      for (let x = minGridPos.gridX; x <= maxGridPos.gridX; x++) {
        const gridPos: GridPosition = { gridX: x, gridY: y }

        if (!this.isCellBlocked(gridPos)) {
          availablePositions.push(gridPos)
        }
      }
    }

    const randomGridPos = availablePositions[Math.floor(Math.random() * availablePositions.length)]
    return gridToWorld(randomGridPos)
  }

  abstract cleanup(): void
}

export class ElectionRoom extends Room {
  initialize(): void {
    npcConfig.forEach((config) => {
      const npc = new NPC(config, this.id, simtownPromptSystem)
      this.npcs.push(npc)
    })
    logger.info(`Initialized ElectionRoom: ${this.name} (${this.id})`)
  }

  cleanup(): void {
    this.npcs.forEach((npc) => npc.cleanup())
    logger.info(`Cleaned up ElectionRoom: ${this.name} (${this.id})`)
  }
}

export class ScavengerHuntRoom extends Room {
  initialize(): void {
    // init only first 2
    npcConfig.slice(0, 2).forEach((config) => {
      const npc = new NPC(config, this.id, scavengerhuntPromptSystem)
      this.npcs.push(npc)
    })
    logger.info(`Initialized ScavengerHuntRoom: ${this.name} (${this.id})`)
  }

  cleanup(): void {
    this.npcs.forEach((npc) => npc.cleanup())
    logger.info(`Cleaned up ScavengerHuntRoom: ${this.name} (${this.id})`)
  }
}

export class CharacterAIRoom extends Room {
  initialize(): void {
    npcConfigCharacterAI.forEach((config) => {
      const npc = new NPC(config, this.id, simtownPromptSystem)
      this.npcs.push(npc)
    })
    logger.info(`Initialized CharacterAIRoom: ${this.name} (${this.id})`)
  }

  cleanup(): void {
    this.npcs.forEach((npc) => npc.cleanup())
    logger.info(`Cleaned up CharacterAIRoom: ${this.name} (${this.id})`)
  }
}
