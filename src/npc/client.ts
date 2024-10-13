import mapData from "../../public/assets/maps/simple-map.json"
import { ChatMessage, PlayerData, UpdatePlayerData } from "../shared/types"
import { AiBrain } from "./AiBrain"
import { functionToSchema } from "./aihelper"
import { move_to_args, npcConfig } from "./npcConfig"
import EasyStar from "easystarjs"
import { Socket, io } from "socket.io-client"
import { z } from "zod"

class NPC {
  private collisionLayer: any
  private collisionGrid: number[][]
  private socket: Socket
  private playerId: string
  private playerData: PlayerData
  public otherPlayers: Map<string, PlayerData>
  private targetPosition: { x: number; y: number }
  private tileSize: number
  private movementController: MovementController
  private lastUpdateTime: number
  private aiBrain: AiBrain
  private lastMessageFrom: string | null = null
  private backstory: string[]

  constructor(backstory: string[]) {
    this.backstory = backstory
    this.collisionLayer = mapData.layers.find((layer: any) => layer.name === "Collisions")!
    this.collisionGrid = []
    this.socket = io("http://localhost:3000", { autoConnect: false })
    this.otherPlayers = new Map()
    this.targetPosition = { x: 0, y: 0 }
    this.tileSize = 16
    this.lastUpdateTime = Date.now()
    this.initializeCollisionGrid()
    this.setupSocketEvents()
    this.startMovementLoop()
    this.socket.connect()

    setTimeout(() => {
      this.startNextAction()
    }, 4000)
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
              backstory: this.backstory.join("\n"),
              tools: [functionToSchema(this.move_to, move_to_args, "Move the NPC to the specified coordinates.")],
              functionMap: {
                move_to: this.move_to.bind(this),
              },
              playerData: this.playerData,
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

      this.socket.on("playerLeft", (playerId: string) => {
        this.otherPlayers.delete(playerId)
      })

      // Listen for incoming messages
      this.socket.on("newMessage", async (message: ChatMessage) => {
        if (message.to === this.playerId) {
          try {
            const response = await this.aiBrain.handleMessage(message)
            const replyMessage = {
              from: this.playerId,
              message: response,
              to: message.from,
              date: new Date().toISOString(),
            }

            this.aiBrain.memory.conversations.get(message.from)!.push(replyMessage)
            // Send the assistant's response back to the player
            this.socket.emit("sendMessage", replyMessage)
          } catch (error) {
            console.error("Error handling message:", error)
          }
        }
      })
    })
  }

  private startMovementLoop() {
    setInterval(() => {
      if (!this.playerData || !this.movementController) return

      const now = Date.now()
      const deltaTime = now - this.lastUpdateTime

      this.lastUpdateTime = now

      this.movementController.move(deltaTime)
    }, 1000 / 30)

    // setInterval(() => {
    //   console.log(getTime())
    // }, 1000)
  }

  private getPlayerPosition(playerId: string): { x: number; y: number } | null {
    const player = this.otherPlayers.get(playerId)
    return player ? { x: player.x, y: player.y } : null
  }

  private async startNextAction() {
    //const currentAction = this.aiBrain.currentAction

    console.log("shifting")
    const temp = this.aiBrain.memory.planForTheDay.shift()
    if (!temp) {
      console.log("no action to perform")
      return
    }
    this.aiBrain.currentAction = temp
    console.log("shifr result is", temp)
    const targetPlayerId = this.otherPlayers.keys().next().value
    const playerPosition = this.getPlayerPosition(targetPlayerId)

    switch (this.aiBrain.currentAction.action.type) {
      case "move":
        //const playerPosition = this.getPlayerPosition(this.aiBrain.currentAction.action.target)

        if (playerPosition) {
          console.log("Moving to player")
          await this.move_to({ x: playerPosition.x, y: playerPosition.y })
        }
        break
      case "talk":
        console.log("Talking to player")
        if (playerPosition) {
          console.log("Moving to player")
          await this.move_to({ x: playerPosition.x, y: playerPosition.y })
        }
        const response = await this.aiBrain.startConversation(targetPlayerId)
        console.log("response", response)
        const message = {
          from: this.playerData.id,
          message: response,
          to: targetPlayerId,
          date: new Date().toISOString(),
        }
        this.aiBrain.memory.conversations.get(targetPlayerId)?.push(message)

        this.socket.emit("sendMessage", message)

        break
    }

    this.startNextAction()
  }

  worldToGrid(x: number, y: number) {
    return {
      x: Math.floor(x / this.tileSize),
      y: Math.floor(y / this.tileSize),
    }
  }

  gridToWorld(x: number, y: number) {
    return {
      x: x * this.tileSize + this.tileSize / 2,
      y: y * this.tileSize + this.tileSize / 2,
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

  getBlockingPlayerId(x: number, y: number): string | null {
    for (const [playerId, player] of this.otherPlayers.entries()) {
      const gridPos = this.worldToGrid(player.x, player.y)
      if (gridPos.x === x && gridPos.y === y) {
        return playerId
      }
    }
    return null
  }

  calculatePath(considerPlayers: boolean, callback: (foundPath: { x: number; y: number }[] | null) => void) {
    const start = this.worldToGrid(this.playerData.x, this.playerData.y)
    const end = this.worldToGrid(this.targetPosition.x, this.targetPosition.y)

    const easystar = new EasyStar.js()
    easystar.setAcceptableTiles([0])
    easystar.enableDiagonals()
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
    easystar.findPath(start.x, start.y, end.x, end.y, (foundPath) => {
      callback(foundPath)
    })
    easystar.calculate()
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

  async move_to(args: z.infer<typeof move_to_args>) {
    const { x, y } = args
    this.targetPosition.x = x
    this.targetPosition.y = y
    console.log(`Received command to move to position: (${x}, ${y})`)

    try {
      // Wrap the callback-based function into a Promise
      const foundPath = await new Promise((resolve, reject) => {
        this.calculatePath(false, (foundPath) => {
          if (foundPath) {
            resolve(foundPath)
          } else {
            reject(new Error("Couldn't find path"))
          }
        })
      })

      // Proceed if path is found
      // @ts-ignore
      this.movementController.setPath(foundPath)
      return "Moving to target position"
    } catch (error) {
      // Handle the error case
      if (!this.lastMessageFrom) {
        console.error("No message from to send reply to")
        throw new Error("No message from to send reply to")
      }
      const replyMessage = {
        from: this.playerId,
        to: this.lastMessageFrom,
        message: "Please provide two numbers as coordinates",
        date: new Date().toISOString(),
      } as ChatMessage
      this.socket.emit("sendMessage", replyMessage)
      return "Couldn't move there, those numbers are not valid coordinates"
    }
  }
}

class MovementController {
  private path: { x: number; y: number }[] = []
  private pathIndex = 0
  private speed = 50 // pixels per second
  private blockedByPlayerInfo: { playerId: string; startTime: number } | null = null
  private sentMoveMessage: boolean = false

  constructor(
    private playerData: PlayerData,
    private socket: Socket,
    private npc: NPC,
  ) {}

  setPath(newPath: { x: number; y: number }[]) {
    this.path = newPath
    this.pathIndex = 0
    this.blockedByPlayerInfo = null
    this.sentMoveMessage = false
  }

  move(deltaTime: number) {
    if (this.pathIndex >= this.path.length) {
      // NPC has reached the destination or waiting
      this.playerData.animation = `${this.playerData.spriteType}-idle`

      const updateData: UpdatePlayerData = {
        x: this.playerData.x,
        y: this.playerData.y,
        animation: this.playerData.animation,
        flipX: this.playerData.flipX,
      }

      this.socket.emit("updatePlayerData", updateData)
      return
    }

    const nextTile = this.path[this.pathIndex]
    const worldPos = this.npc.gridToWorld(nextTile.x, nextTile.y)

    if (this.npc.isCellBlocked(nextTile.x, nextTile.y)) {
      // Try to recalculate path considering players as obstacles
      this.npc.calculatePath(true, (newPath) => {
        if (newPath && newPath.length > 0) {
          // Found an alternative path, update the path and continue
          this.setPath(newPath)
        } else {
          // No alternative path found, handle blocking player
          const blockingPlayerId = this.npc.getBlockingPlayerId(nextTile.x, nextTile.y)
          if (blockingPlayerId) {
            if (!this.blockedByPlayerInfo || this.blockedByPlayerInfo.playerId !== blockingPlayerId) {
              this.blockedByPlayerInfo = { playerId: blockingPlayerId, startTime: Date.now() }
              this.sentMoveMessage = false
            }

            const elapsedTime = Date.now() - this.blockedByPlayerInfo.startTime

            if (elapsedTime < 5000) {
              if (!this.sentMoveMessage) {
                // Send message to the blocking player
                const replyMessage = {
                  from: this.playerData.id,
                  to: blockingPlayerId,
                  message: "Please move, you're blocking my path.",
                  date: new Date().toISOString(),
                } as ChatMessage
                this.socket.emit("sendMessage", replyMessage)
                this.sentMoveMessage = true
              }

              // Wait and keep trying to find a path
              // Update animation to idle and send update to server
              this.playerData.animation = `${this.playerData.spriteType}-idle`

              const updateData: UpdatePlayerData = {
                x: this.playerData.x,
                y: this.playerData.y,
                animation: this.playerData.animation,
                flipX: this.playerData.flipX,
              }

              this.socket.emit("updatePlayerData", updateData)

              // Try to recalculate the path again in the next move cycle
              return
            } else {
              // 5 seconds have passed, NPC gives up on reaching the target
              this.blockedByPlayerInfo = null
              this.sentMoveMessage = false

              // Clear the path to stop movement
              this.path = []
              this.pathIndex = 0

              // Update NPC's state to idle
              this.playerData.animation = `${this.playerData.spriteType}-idle`

              const updateData: UpdatePlayerData = {
                x: this.playerData.x,
                y: this.playerData.y,
                animation: this.playerData.animation,
                flipX: this.playerData.flipX,
              }

              this.socket.emit("updatePlayerData", updateData)

              console.log("Blocked for 5 seconds, giving up on reaching the target.")
            }
          } else {
            // Path is blocked by an obstacle
            console.log("Path blocked by obstacle, recalculating path.")
            // Try to recalculate the path considering players
            this.npc.calculatePath(true, (newPath) => {
              if (newPath && newPath.length > 0) {
                this.setPath(newPath)
              } else {
                // No path found, wait or handle accordingly
                console.log("No path found after considering players.")
              }
            })
          }
        }
      })
      return
    }

    // Proceed with movement as normal
    const dx = worldPos.x - this.playerData.x
    const dy = worldPos.y - this.playerData.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    const moveDistance = (this.speed * deltaTime) / 1000

    if (distance < moveDistance) {
      this.playerData.x = worldPos.x
      this.playerData.y = worldPos.y
      this.pathIndex++
    } else {
      const moveX = (dx / distance) * moveDistance
      const moveY = (dy / distance) * moveDistance

      this.playerData.x += moveX
      this.playerData.y += moveY
    }

    // Animation update with movement threshold
    const epsilon = 0.1 // Threshold for minimal movement
    const isMoving = Math.abs(dx) > epsilon || Math.abs(dy) > epsilon

    this.playerData.flipX = dx < 0
    this.playerData.animation = isMoving ? `${this.playerData.spriteType}-walk` : `${this.playerData.spriteType}-idle`

    const updateData: UpdatePlayerData = {
      x: this.playerData.x,
      y: this.playerData.y,
      animation: this.playerData.animation,
      flipX: this.playerData.flipX,
    }

    this.socket.emit("updatePlayerData", updateData)
  }
}

for (const config of npcConfig) {
  new NPC(config.backstory)
}
