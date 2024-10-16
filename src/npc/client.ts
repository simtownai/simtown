import mapData from "../../public/assets/maps/simple-map.json"
import { CONFIG } from "../shared/config"
import { ChatMessage, PlayerData } from "../shared/types"
import { AiBrain, FunctionSchema } from "./AiBrain"
import { MovementController } from "./MovementController"
import { Action } from "./actions/Action"
import { IdleAction } from "./actions/IdleAction"
import { MoveAction } from "./actions/MoveAction"
import { TalkAction } from "./actions/TalkAction"
import { functionToSchema } from "./aihelper"
import { NpcConfig, move_to_args, npcConfig } from "./npcConfig"
import EasyStar from "easystarjs"
import { Socket, io } from "socket.io-client"

export class NPC {
  private collisionLayer: any
  private collisionGrid: number[][]
  socket: Socket
  private playerId: string
  playerData: PlayerData
  public otherPlayers: Map<string, PlayerData>
  private tileSize: number
  movementController: MovementController
  private lastUpdateTime: number
  aiBrain: AiBrain
  private npcConfig: NpcConfig
  private currentAction: Action | null = null
  private actionStack: Action[] = []
  private talkActionSchema: FunctionSchema[]
  private talkActionFunctionMap: { [functionName: string]: Function }

  constructor(npcConfig: NpcConfig) {
    this.npcConfig = npcConfig
    this.collisionLayer = mapData.layers.find((layer: any) => layer.name === "Collisions")!
    this.collisionGrid = []
    this.socket = io("http://localhost:3000", { autoConnect: false })
    this.otherPlayers = new Map()
    this.tileSize = 16
    this.lastUpdateTime = Date.now()
    this.initializeCollisionGrid()
    this.setupSocketEvents()
    this.startUpdateLoop()
    this.socket.connect()
    this.socket.emit("joinGame", this.npcConfig.username, this.npcConfig.spriteDefinition)
    this.talkActionSchema = [
      functionToSchema(this.pushMoveToAction, move_to_args, "Move the NPC to the specified coordinates."),
    ]
    this.talkActionFunctionMap = {
      pushMoveToAction: this.pushMoveToAction.bind(this),
    }

    setTimeout(() => {
      this.startNextAction()
    }, 7000)
  }

  pushMoveToAction(args: { x: number; y: number }) {
    const action = new MoveAction(this, args)
    return this.pushNewAction(action)
  }
  pushNewAction(action: Action) {
    if (this.currentAction) {
      console.log("Interrupting action", this.currentAction.constructor.name)
      this.currentAction.interrupt()
      this.actionStack.push(this.currentAction)
    }

    // Always create a new MoveAction, regardless of whether there was a current action
    this.currentAction = action
    console.log("Starting new action", action.constructor.name)
    action.start()
    return "Pushed new action to stack"
  }

  private initializeCollisionGrid() {
    for (let y = 0; y < this.collisionLayer.height; y++) {
      const row: number[] = []
      for (let x = 0; x < this.collisionLayer.width; x++) {
        const tileIndex = y * this.collisionLayer.width + x
        const tileId = this.collisionLayer.data[tileIndex]
        row.push(tileId === 0 ? 0 : 1)
      }
      this.collisionGrid.push(row)
    }
  }

  private setupSocketEvents() {
    this.socket.on("connect", () => {
      this.playerId = this.socket.id!
      this.socket.on("existingPlayers", (players: PlayerData[]) => {
        players.forEach((player) => {
          if (player.id === this.playerId) {
            this.playerData = player
            this.movementController = new MovementController(this.playerData, this.socket, this)
            this.aiBrain = new AiBrain({
              npcConfig: this.npcConfig,
              socket: this.socket,
            })
          } else {
            this.otherPlayers.set(player.id, player)
          }
        })
      })

      this.socket.on("playerJoined", (player: PlayerData) => {
        if (player.id !== this.playerId) {
          this.otherPlayers.set(player.id, player)
        }
      })

      this.socket.on("playerDataChanged", (player: PlayerData) => {
        if (player.id !== this.playerId) {
          this.otherPlayers.set(player.id, player)
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
          // Create a new action to handle the message
          const action = new TalkAction(this, message.from, this.talkActionSchema, this.talkActionFunctionMap, {
            type: "existing",
            message: message,
          })
          this.pushNewAction(action)
        }
      })
    })
  }

  private startUpdateLoop() {
    setInterval(() => {
      if (!this.playerData) return

      const now = Date.now()
      const deltaTime = now - this.lastUpdateTime
      this.lastUpdateTime = now

      if (this.currentAction) {
        this.currentAction.update(deltaTime)

        if (this.currentAction.isCompleted()) {
          this.currentAction = this.actionStack.pop() || null
          if (this.currentAction) {
            this.currentAction.resume()
          } else {
            this.startNextAction()
          }
        }
      }
    }, 1000 / 30)
  }

  async move_to(args: { x: number; y: number }) {
    const { x, y } = args
    console.log(`Received command to move to position: (${x}, ${y})`)

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

  private async startNextAction() {
    const nextActionData = this.aiBrain.memory.planForTheDay.shift()
    if (!nextActionData) {
      console.log("No action to perform")
      return
    }

    let action: Action | null = null

    let targetPlayerId: string | null = null

    switch (nextActionData.action.type) {
      case "idle":
        action = new IdleAction(this, 600000) // idle for 10 minutes
        break
      case "move":
        console.log("Moving to player")
        targetPlayerId = nextActionData.action.target
        const playerPosition = this.getPlayerPosition(targetPlayerId)
        if (playerPosition) {
          action = new MoveAction(this, playerPosition)
        }
        break
      case "talk":
        targetPlayerId = nextActionData.action.name
        action = new TalkAction(this, targetPlayerId, this.talkActionSchema, this.talkActionFunctionMap, {
          type: "new",
        })
        break
    }

    if (action) {
      if (this.currentAction) {
        this.currentAction.interrupt()
        this.actionStack.push(this.currentAction)
      }
      this.currentAction = action
      console.log("Starting action: " + action.constructor.name)
      action.start()
    }
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
    return tileValue !== 0
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

  // Refactored to return a Promise instead of using a callback
  async calculatePath(
    targetPosition: { x: number; y: number },
    considerPlayers: boolean,
  ): Promise<{ x: number; y: number }[] | null> {
    const start = this.worldToGrid(this.playerData.x, this.playerData.y)
    const end = this.worldToGrid(targetPosition.x, targetPosition.y)

    const easystar = new EasyStar.js()
    easystar.setAcceptableTiles([0])
    // easystar.enableDiagonals()
    easystar.disableCornerCutting()

    let grid: number[][]
    if (considerPlayers) {
      // Update grid with players as obstacles
      grid = this.getGridWithPlayers()
    } else {
      // Use collision grid without players
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
        gridWithPlayers[gridPos.y][gridPos.x] = 1
      }
    }
    return gridWithPlayers
  }
}

for (const config of npcConfig) {
  new NPC(config)
}
