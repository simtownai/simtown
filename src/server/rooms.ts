import { NPC } from "../npc/client"
import { PromptSystem } from "../npc/prompts"
import { CONFIG } from "../shared/config"
import { gridToWorld, worldToGrid } from "../shared/functions"
import logger from "../shared/logger"
import {
  GridPosition,
  MapConfig,
  MapData,
  NPCConfig,
  NewsItem,
  Object,
  PlayerData,
  PlayerSpriteDefinition,
  UpdatePlayerData,
  VoteCandidate,
} from "../shared/types"
import * as fs from "fs"

export class Room {
  protected id: string
  protected name: string
  protected mapConfig: MapConfig
  protected mapData: MapData
  protected players: Map<string, PlayerData>
  protected NPCConfigs: NPCConfig[]
  protected npcs: NPC[]
  protected promptSystem: PromptSystem
  protected created: Date
  protected newsPaper: NewsItem[]
  protected voteResults: Map<string, VoteCandidate>[]
  protected places: Object[]
  protected spawnArea: Object

  constructor(id: string, name: string, mapConfig: MapConfig, NPCConfigs: NPCConfig[], promptSystem: PromptSystem) {
    this.id = id
    this.name = name
    this.mapConfig = mapConfig
    this.NPCConfigs = NPCConfigs
    this.promptSystem = promptSystem
    this.players = new Map()
    this.npcs = []
    this.created = new Date()
    this.newsPaper = []
    this.voteResults = [new Map()]

    // ToDo: maybe add cache for json files and load them from cache
    this.mapData = JSON.parse(fs.readFileSync(`./public/assets/maps/${this.mapConfig.mapJSONFilename}.json`, "utf8"))

    this.places = this.mapData.layers.find((layer) => layer.name === this.mapConfig.placesLayerName)!.objects!
    this.spawnArea = this.places.find((obj) => obj.name === this.mapConfig.spawnPlaceName)!
  }

  initialize(): void {
    this.NPCConfigs.forEach((config) => {
      const npc = new NPC(config, this.id, this.promptSystem, this.mapConfig, this.mapData)
      this.npcs.push(npc)
    })
    logger.info(`Initialized '${this.constructor.name}' with name '${this.name}' and id '${this.id}'`)
  }

  getMapConfig(): MapConfig {
    return this.mapConfig
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

  getPlaces(): Object[] {
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

  cleanup(): void {
    this.npcs.forEach((npc) => npc.cleanup())
    logger.info(`Cleaned up ${this.constructor.name}: ${this.name} (${this.id})`)
  }
}
