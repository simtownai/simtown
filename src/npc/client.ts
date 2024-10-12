import mapData from "../../public/assets/maps/simple-map.json"
import { ChatMessage, PlayerData, UpdatePlayerData } from "../shared/types"
import EasyStar from "easystarjs"
import { Socket, io } from "socket.io-client"
import { Brain } from "./brain"
import { npcConfig, tools } from "./npcConfig"
import client from "./openai"
import { ChatCompletionMessageParam } from "openai/src/resources/index.js"

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
  private brain: Brain

  constructor(backstory: string[], planForTheDay: string[]) {
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

 

    this.brain = new Brain(backstory, planForTheDay);


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

          await this.handleMessage(message);
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


  async handleMessage(chatMessage: ChatMessage) {
    const messages = [
      {
        role: "system",
        content: `You are an NPC in a game. Your role is to interact with the player and decide what action to take based on the player's messages. You can perform actions like moving to a location or sending a message.`,
      },
      {
        role: "user",
        content: chatMessage.message,
      },
    ];

    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages as ChatCompletionMessageParam[],
        tools:  tools.map(tool => ({
          ...tool,
          type: "function" as const
        })),
        tool_choice: "auto",
      });

      const responseMessage = completion.choices[0].message;

      if (responseMessage.tool_calls) {
        const toolCall = responseMessage.tool_calls[0].function;
        // The model wants to call a function
        const functionName = toolCall.name;
        const functionArgs = JSON.parse(toolCall.arguments);

        if (functionName === "move_to") {
          const { x, y } = functionArgs;
          await this.move_to(x, y, chatMessage.from);
        } else if (functionName === "say") {
          const { message } = functionArgs;
          await this.say(message, chatMessage.from);
        }
      } else if (responseMessage.content) {
        // The model returned a message directly
        await this.say(responseMessage.content, chatMessage.from);
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
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


  public getBrainData(): Brain {
    return this.brain;
  }

  async move_to(x: number, y: number, from:string) {
    this.targetPosition.x = x;
    this.targetPosition.y = y;
    console.log(`Received command to move to position: (${x}, ${y})`);

    // Calculate path and start moving
    this.calculatePath(false, (foundPath) => {
      if (foundPath) {
        this.movementController.setPath(foundPath);
      } else {
        const replyMessage = {
          from: this.playerId,
          to: from,
          message: "Please provide two numbers as coordinates",
          date: new Date().toISOString(),
        } as ChatMessage
        this.socket.emit("sendMessage", replyMessage)
        
      }
    });
  }

  async say(message: string, to: string) {
    const replyMessage = {
      from: this.playerId,
      to: to,
      message: message,
      date: new Date().toISOString(),
    } as ChatMessage;
    this.socket.emit("sendMessage", replyMessage);
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

// do we want to add this to observation when it's starting or when it's ending?
    this.npc.getBrainData().addObservation({
      event: 'moving',
      details: `Path set to ${JSON.stringify(newPath)}`,
      timestamp: new Date(),
    });
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
  new NPC(config.backstory, config.planForTheDay)
}