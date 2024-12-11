import { NPC } from "../npc/client"
import { CONFIG } from "../shared/config"
import { gridToWorld, worldToGrid } from "../shared/functions"
import logger from "../shared/logger"
import { Database, Tables } from "../shared/supabase-types"
import {
  GridPosition,
  MapData,
  NewsItem,
  Object,
  PlayerData,
  PlayerSpriteDefinition,
  UpdatePlayerData,
  VoteCandidate,
} from "../shared/types"
import { SupabaseClient } from "@supabase/supabase-js"
import * as fs from "fs"

export class RoomInstance {
  protected id: string
  protected mapConfig: Tables<"map">
  protected mapData: MapData
  protected players: Map<string, PlayerData>
  protected NPCConfigs: Tables<"npc">[]
  protected NPCInstances: Tables<"npc_instance">[]
  protected npcs: NPC[]
  protected scenario: string
  protected created: Date
  protected newsPaper: NewsItem[]
  protected voteResults: Map<string, VoteCandidate>[]
  protected places: Object[]
  protected spawnArea: Object
  protected playerToSocket: Map<string, string>

  constructor(
    id: string,
    mapConfig: Tables<"map">,
    NPCConfigs: Tables<"npc">[],
    scenario: string,
    NPCInstances: Tables<"npc_instance">[] = [],
  ) {
    this.id = id
    this.mapConfig = mapConfig
    this.NPCConfigs = NPCConfigs
    this.NPCInstances = NPCInstances
    this.scenario = scenario
    this.players = new Map()
    this.npcs = []
    this.created = new Date()
    this.newsPaper = []
    this.voteResults = [new Map()]
    this.playerToSocket = new Map()

    // ToDo: maybe add cache for json files and load them from cache
    this.mapData = JSON.parse(fs.readFileSync(`./public/assets/maps/${this.mapConfig.map_json_filename}.json`, "utf8"))

    this.places = this.mapData.layers.find((layer) => layer.name === CONFIG.MAP_PLACES_LAYER_NAME)!.objects!
    this.spawnArea = this.places.find((obj) => obj.name === this.mapConfig.spawn_place_name)!
  }

  initialize(): void {
    this.NPCConfigs.forEach((config) => {
      const npcInstance = this.NPCInstances.find((instance) => instance.npc_id === config.id)

      let npc: NPC
      if (npcInstance) {
        npc = new NPC(
          config,
          this.id,
          this.scenario,
          this.mapConfig,
          this.mapData,
          npcInstance.reflections ? npcInstance.reflections : undefined,
          npcInstance.position_x !== null && npcInstance.position_y !== null
            ? { x: npcInstance.position_x, y: npcInstance.position_y }
            : undefined,
        )
      } else {
        npc = new NPC(config, this.id, this.scenario, this.mapConfig, this.mapData)
      }
      this.npcs.push(npc)
    })
    logger.info(`Initialized room instance with id '${this.id}'`)
  }

  setNewsPaper(newsPaper: NewsItem[]) {
    this.newsPaper = newsPaper
  }

  getMapConfig(): Tables<"map"> {
    return this.mapConfig
  }

  getId(): string {
    return this.id
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

  getPlayerSocketId(playerId: string): string {
    return this.playerToSocket.get(playerId)!
  }

  addPlayer(
    socketId: string,
    supabaseClient: SupabaseClient<Database>,
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

    if (!isNPC) {
      supabaseClient.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabaseClient
            .from("user_room_instance")
            .insert([{ user_id: user.id, room_instance_id: this.id }])
            .then(({ error }) => {
              if (error) {
                logger.error(`Error adding user to room instance: ${error.message}`)
              }
            })
        }
      })
    }

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

  dumpStateToDatabase(supabaseClient: SupabaseClient<Database>) {
    supabaseClient
      .from("room_instance")
      .update({ newspaper: this.newsPaper })
      .eq("id", this.id)
      .then(({ error }) => {
        if (error) {
          logger.error(`Error updating room instance: ${error.message}`)
        }
      })

    this.npcs.forEach((npc) => {
      const { x, y } = gridToWorld(worldToGrid(npc.playerData.x, npc.playerData.y))
      supabaseClient
        .from("npc_instance")
        .update({
          position_x: x,
          position_y: y,
          reflections: npc.aiBrain.getReflections(),
        })
        .eq("room_instance_id", this.id)
        .eq("npc_id", npc.id)
        .then(({ error }) => {
          if (error) {
            logger.error(`Error updating NPC instance: ${error.message}`)
          }
        })
    })
  }

  cleanup(): void {
    this.npcs.forEach((npc) => npc.cleanup())
    logger.info(`Cleaned up room instance with id '${this.id}'`)
  }
}
