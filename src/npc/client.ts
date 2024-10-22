import mapData from "../../public/assets/maps/simple-map.json"
import { CONFIG } from "../shared/config"
import { ChatMessage, PlayerData } from "../shared/types"
import { ActionManager } from "./ActionManager"
import { AiBrain } from "./AiBrain"
import { MovementController } from "./MovementController"
import { MoveTarget } from "./Plan"
import { Action } from "./actions/Action"
import { TalkAction } from "./actions/TalkAction"
import { NpcConfig, npcConfig } from "./npcConfig"
import EasyStar from "easystarjs"
import { Socket, io } from "socket.io-client"

export class NPC {
  private collisionLayer: (typeof mapData.layers)[0]
  objectLayer: (typeof mapData.layers)[0]["objects"]
  private roadLayer: (typeof mapData.layers)[0] | undefined
  private collisionGrid: number[][]
  socket: Socket
  playerData: PlayerData
  public otherPlayers: Map<string, PlayerData>
  private tileSize: number
  movementController: MovementController
  aiBrain: AiBrain
  npcConfig: NpcConfig
  lastUpdateTime: number

  private actionManager: ActionManager

  constructor(npcConfig: NpcConfig) {
    this.npcConfig = npcConfig
    this.collisionLayer = mapData.layers.find((layer) => layer.name === "Collisions")!
    this.roadLayer = mapData.layers.find((layer) => layer.name === "Roads")
    this.objectLayer = mapData.layers.find((layer) => layer.name === "Boxes")!.objects!
    this.collisionGrid = []
    this.socket = io("http://localhost:3000", { autoConnect: false })
    this.otherPlayers = new Map()
    this.tileSize = 16
    this.initializeCollisionGrid()
    this.lastUpdateTime = Date.now()
    this.setupSocketEvents()
    this.socket.connect()
    this.socket.emit("joinGame", this.npcConfig.username, this.npcConfig.spriteDefinition)
  }

  private initializeCollisionGrid() {
    for (let y = 0; y < this.collisionLayer.height!; y++) {
      const row: number[] = []
      for (let x = 0; x < this.collisionLayer.width!; x++) {
        const tileIndex = y * this.collisionLayer.width! + x
        const collisionTileId = this.collisionLayer.data![tileIndex]
        const roadTileId = this.roadLayer ? this.roadLayer.data![tileIndex] : null

        if (collisionTileId !== 0) {
          row.push(0)
        } else if (roadTileId !== null && roadTileId !== 0) {
          row.push(1)
        } else {
          row.push(10)
        }
      }
      this.collisionGrid.push(row)
    }
  }

  private setupSocketEvents() {
    this.socket.on("connect", () => {
      const playerId = this.socket.id!
      this.socket.on("existingPlayers", (players: PlayerData[]) => {
        players.forEach(async (player) => {
          if (player.id === playerId) {
            this.playerData = player
            this.movementController = new MovementController(this.playerData, this.socket, this)
            this.aiBrain = new AiBrain({
              npcConfig: this.npcConfig,
              socket: this.socket,
            })
            setTimeout(async () => {
              try {
                this.actionManager = new ActionManager(this)
                this.startUpdateLoop()
              } catch (error) {
                console.error("Error generating plan for the day:", error)
              }
            }, 5000)
          } else {
            this.otherPlayers.set(player.username, player)
          }
        })
      })

      this.socket.on("playerJoined", (player: PlayerData) => {
        if (!this.playerData || player.id !== this.playerData.id) {
          this.otherPlayers.set(player.username, player)
        }
      })

      this.socket.on("playerDataChanged", (player: PlayerData) => {
        if (player.id !== this.playerData.id) {
          this.otherPlayers.set(player.username, player)
        }
      })

      this.socket.on("endConversation", (message: ChatMessage) => {
        if (message.to === this.npcConfig.username) {
          this.aiBrain.memory.conversations.addChatMessage(message.from, message)
          this.aiBrain.memory.conversations.addAIMessage(message.from, {
            role: "user",
            content: message.message,
          })
          this.aiBrain.memory.conversations.closeThread(message.from)
        }
      })

      this.socket.on("playerLeft", (playerId: string) => {
        this.otherPlayers.delete(playerId)
      })

      // Listen for incoming messages
      this.socket.on("newMessage", async (message: ChatMessage) => {
        if (message.to === this.npcConfig.username) {
          // Check if we're already in a TalkAction with this person
          const currentAction = this.actionManager.getCurrentAction()
          if (currentAction instanceof TalkAction && currentAction.targetPlayerUsername === message.from) {
            // Update the current TalkAction with the new message
            currentAction.handleMessage(message)
          } else {
            // Create a new action to handle the message
            const action = new TalkAction(this, message.from, {
              type: "existing",
              message: message,
            })
            this.pushNewAction(action)
          }
        }
      })
    })
  }

  async move_to(moveTarget: MoveTarget) {
    let [x, y] = [0, 0]

    if (moveTarget.targetType === "coordinates") {
      x = moveTarget.x
      y = moveTarget.y
    } else if (moveTarget.targetType === "person") {
      const player = this.otherPlayers.get(moveTarget.name)
      if (!player) {
        return "Couldn't find that player"
      }
      x = player.x - 32
      y = player.y
    } else if (moveTarget.targetType === "place") {
      const place = this.objectLayer!.find((obj) => obj.name === moveTarget.name)
      if (!place) {
        return "Couldn't find that place"
      }

      const randomX = place.x + Math.random() * place.width
      const randomY = place.y + Math.random() * place.height

      x = randomX
      y = randomY
    }

    console.log(`Received command to move to position: (${x}, ${y})`, moveTarget)

    try {
      const foundPath = await this.calculatePath({ x, y }, false)
      if (!foundPath || foundPath.length === 0) {
        throw new Error("Couldn't find path")
      }

      this.movementController.setPath(foundPath, { x, y }) // Pass targetPosition
      return "Moving to target position"
    } catch (error) {
      console.error("Error in move_to:", error)
      return "Couldn't move there, those numbers are not valid coordinates"
    }
  }

  getPlayerPosition(_playerId: string): { x: number; y: number } | null {
    const temp_player = this.otherPlayers.keys().next().value
    const player = this.otherPlayers.get(temp_player)
    return player ? { x: player.x, y: player.y } : null
  }

  worldToGrid(x: number, y: number) {
    const verticalOffset = CONFIG.SPRITE_HEIGHT - CONFIG.SPRITE_COLLISION_BOX_HEIGHT
    return {
      x: Math.floor(x / this.tileSize),
      y: Math.floor((y + verticalOffset / 2) / this.tileSize),
    }
  }

  gridToWorld(x: number, y: number) {
    const verticalOffset = CONFIG.SPRITE_HEIGHT - CONFIG.SPRITE_COLLISION_BOX_HEIGHT
    return {
      x: x * this.tileSize + this.tileSize / 2,
      y: y * this.tileSize + this.tileSize / 2 - verticalOffset / 2,
    }
  }

  isCellBlocked(x: number, y: number): boolean {
    // Check for players at the given grid position
    for (const player of this.otherPlayers.values()) {
      const gridPos = this.worldToGrid(player.x, player.y)
      if (gridPos.x === x && gridPos.y === y) {
        return true
      }
    }

    // Check for static collisions
    if (x < 0 || y < 0 || y >= this.collisionGrid.length || x >= this.collisionGrid[0].length) {
      return true
    }
    const tileValue = this.collisionGrid[y][x]
    return tileValue === 0
  }

  getBlockingPlayer(x: number, y: number): PlayerData | null {
    for (const [_playerId, player] of this.otherPlayers.entries()) {
      const gridPos = this.worldToGrid(player.x, player.y)
      if (gridPos.x === x && gridPos.y === y) {
        return player
      }
    }
    return null
  }

  async calculatePath(
    targetPosition: { x: number; y: number },
    considerPlayers: boolean,
  ): Promise<{ x: number; y: number }[] | null> {
    const start = this.worldToGrid(this.playerData.x, this.playerData.y)
    const end = this.worldToGrid(targetPosition.x, targetPosition.y)

    const easystar = new EasyStar.js()

    easystar.setAcceptableTiles([1, 10])

    easystar.setTileCost(1, 1)
    easystar.setTileCost(10, 10)

    // easystar.enableDiagonals()
    easystar.disableCornerCutting()

    let grid: number[][]
    if (considerPlayers) {
      grid = this.getGridWithPlayers()
    } else {
      grid = this.collisionGrid
    }

    easystar.setGrid(grid)

    return new Promise((resolve) => {
      easystar.findPath(start.x, start.y, end.x, end.y, (foundPath) => {
        resolve(foundPath)
      })
      easystar.calculate()
    })
  }

  getGridWithPlayers(): number[][] {
    const gridWithPlayers = this.collisionGrid.map((row) => row.slice())
    for (const player of this.otherPlayers.values()) {
      const gridPos = this.worldToGrid(player.x, player.y)
      if (
        gridPos.x >= 0 &&
        gridPos.x < gridWithPlayers[0].length &&
        gridPos.y >= 0 &&
        gridPos.y < gridWithPlayers.length
      ) {
        gridWithPlayers[gridPos.y][gridPos.x] = 0
      }
    }
    return gridWithPlayers
  }

  private startUpdateLoop() {
    setInterval(async () => {
      if (!this.playerData) return

      const now = Date.now()
      const deltaTime = now - this.lastUpdateTime
      this.lastUpdateTime = now

      await this.actionManager.update(deltaTime)
    }, 1000 / 30)
  }

  pushNewAction(action: Action) {
    return this.actionManager.interruptCurrentActionAndExecuteNew(action)
  }
}

for (const config of npcConfig) {
  new NPC(config)
}
