import mapData from "../../public/assets/maps/simple-map.json"
import { ChatMessage, PlayerData, UpdatePlayerData } from "../shared/types"
import { MovementController } from "./MovementController"
import { BroadcastAction } from "./actions/BroadcastAction"
import { TalkAction } from "./actions/TalkAction"
import { AIBrain } from "./brain/AIBrain"
import { NpcConfig, npcConfig } from "./npcConfig"
import { Socket, io } from "socket.io-client"

export class NPC {
  movementController: MovementController
  aiBrain: AIBrain
  private socket: Socket
  private playerData: PlayerData
  private otherPlayers: Map<string, PlayerData>
  private lastUpdateTime: number
  private placesNames: string[]

  constructor(private npcConfig: NpcConfig) {
    this.socket = io("http://localhost:3000", { autoConnect: false })
    this.otherPlayers = new Map()
    this.lastUpdateTime = Date.now()
    this.placesNames = mapData.layers.find((layer) => layer.name === "Boxes")!.objects!.map((obj) => obj.name)

    // const placesNames = this.npc.objectLayer!
    setTimeout(() => {
      this.setupSocketEvents()
      this.socket.connect()
      this.socket.emit("joinGame", true, this.npcConfig.username, this.npcConfig.spriteDefinition)
    }, 7000)
  }

  private setupSocketEvents() {
    this.socket.on("connect", () => {
      const playerId = this.socket.id!
      this.socket.on("existingPlayers", (players: PlayerData[]) => {
        players.forEach(async (player) => {
          if (player.id === playerId) {
            this.playerData = player
            this.movementController = new MovementController(
              () => this.playerData,
              () => this.otherPlayers,
              (blockingPlayer: PlayerData) => this.sendMoveMessage(blockingPlayer),
              (updatePlayerData: UpdatePlayerData) => this.updateAndEmitPlayerData(updatePlayerData),
            )

            setTimeout(async () => {
              try {
                this.aiBrain = new AIBrain({
                  config: this.npcConfig,
                  getOtherPlayers: () => this.otherPlayers,
                  getPlayerData: () => this.playerData,
                  getMovementController: () => this.movementController,
                  places: this.placesNames,
                  socket: this.socket,
                  setAndEmitPlayerData: (playerData: PlayerData) => this.updateAndEmitPlayerData(playerData),
                })
                this.aiBrain.generatePlanAndSetActions()
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
          this.aiBrain.addChatMessage(message.from, message)
          this.aiBrain.addAIMessage(message.from, {
            role: "user",
            content: message.message,
          })
          this.aiBrain.closeThread(message.from)
        }
      })

      this.socket.on("playerLeft", (username: string) => {
        this.otherPlayers.delete(username)
      })

      // Listen for incoming messages
      this.socket.on("newMessage", async (message: ChatMessage) => {
        if (message.to === this.npcConfig.username) {
          // Check if we're already in a TalkAction with this person
          const currentAction = this.aiBrain.getCurrentAction()
          console.log("currentAction is talkaction", currentAction instanceof TalkAction)
          if (currentAction instanceof TalkAction && currentAction.getTargetPlayerUsername() === message.from) {
            // Update the current TalkAction with the new message
            currentAction.handleMessage(message)
          } else if (currentAction instanceof BroadcastAction) {
            // TODO: figure out whether we want to save talk aproach in memory and come back to the person, I think no
            const refusalMessage: ChatMessage = {
              to: message.from,
              from: this.npcConfig.username,
              message: "I'm sorry, but I'm in the middle of broadcasting right now.",
              date: new Date().toISOString(),
            }
            this.socket.emit("endConversation", refusalMessage)
          } else if (currentAction instanceof TalkAction) {
            // Create a new action to handle the message
            const action = new TalkAction(
              this.aiBrain.getBrainDump,
              this.socket,
              "We received a request to talk but were talking with sb else at the time",
              message.from,
              {
                type: "existing",
                message: message,
              },
              (username) => {
                this.movementController.adjustDirection(username)
              },
            )
            const refusalMessage: ChatMessage = {
              to: message.from,
              from: this.npcConfig.username,
              message: "I'm sorry, but I'm already talking with someone else right now.",
              date: new Date().toISOString(),
            }
            this.socket.emit("sendMessage", refusalMessage)
            return this.aiBrain.pushNewAction(action, 0)
          } else {
            const action = new TalkAction(
              this.aiBrain.getBrainDump,
              this.socket,
              "",
              message.from,
              {
                type: "existing",
                message: message,
              },
              (username) => {
                this.movementController.adjustDirection(username)
              },
            )
            this.aiBrain.interruptCurrentActionAndExecuteNew(action)
          }
        }
      })
    })
  }

  updateAndEmitPlayerData(updatePlayerData: UpdatePlayerData) {
    this.playerData = { ...this.playerData, ...updatePlayerData }
    this.socket.emit("updatePlayerData", updatePlayerData)
  }

  sendMoveMessage(blockingPlayer: PlayerData) {
    const replyMessage: ChatMessage = {
      from: this.playerData.username,
      to: blockingPlayer.username,
      message: "Please move, you're blocking my path.",
      date: new Date().toISOString(),
    }

    this.aiBrain.addChatMessage(blockingPlayer.username, replyMessage)
    this.aiBrain.addAIMessage(blockingPlayer.username, {
      role: "assistant",
      content: "Please move, you're blocking my path.",
    })

    this.socket.emit("sendMessage", replyMessage)
  }

  private startUpdateLoop() {
    setInterval(async () => {
      if (!this.playerData) return

      const now = Date.now()
      const deltaTime = now - this.lastUpdateTime
      this.lastUpdateTime = now

      await this.aiBrain.update(deltaTime)
    }, 1000 / 30)
  }
}

for (const config of npcConfig) {
  new NPC(config)
}
