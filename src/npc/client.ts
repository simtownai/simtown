import mapData from "../../public/assets/maps/simple-map.json"
import { ChatMessage, PlayerData, UpdatePlayerData } from "../shared/types"
import { ActionManager } from "./ActionManager"
import { AiBrain } from "./AiBrain"
import { MovementController } from "./MovementController"
import { BroadcastAction } from "./actions/BroadcastAction"
import { TalkAction } from "./actions/TalkAction"
import { NPCConfig, npcConfig } from "./npcConfig"
import { Socket, io } from "socket.io-client"

export class NPC {
  movementController: MovementController
  aiBrain: AiBrain
  private socket: Socket
  private playerData: PlayerData
  private otherPlayers: Map<string, PlayerData>
  private lastUpdateTime: number
  private actionManager: ActionManager
  private placesNames: string[]

  constructor(private npcConfig: NPCConfig) {
    this.socket = io("http://localhost:3000", { autoConnect: false })
    this.otherPlayers = new Map()
    this.lastUpdateTime = Date.now()
    this.placesNames = mapData.layers.find((layer) => layer.name === "Boxes")!.objects!.map((obj) => obj.name)

    // const placesNames = this.npc.objectLayer!
    setTimeout(() => {
      this.setupSocketEvents()
      this.socket.connect()
      this.socket.emit("joinGame", this.npcConfig.username, this.npcConfig.spriteDefinition)
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
              this.playerData,
              this.otherPlayers,
              this.sendMoveMessage.bind(this),
              this.emitUpdatePlayerData.bind(this),
            )

            setTimeout(async () => {
              try {
                this.actionManager = new ActionManager(this)
                this.aiBrain = new AiBrain(this.npcConfig, this.otherPlayers, this.placesNames, this.actionManager)
                this.actionManager.generatePlanAndSetActions()
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

      this.socket.on("playerLeft", (username: string) => {
        this.otherPlayers.delete(username)
      })

      // Listen for incoming messages
      this.socket.on("newMessage", async (message: ChatMessage) => {
        if (message.to === this.npcConfig.username) {
          // Check if we're already in a TalkAction with this person
          const currentAction = this.actionManager.getCurrentAction()
          console.log("currentAction is talkaction", currentAction instanceof TalkAction)
          if (currentAction instanceof TalkAction && currentAction.targetPlayerUsername === message.from) {
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
            this.socket.emit("sendMessage", refusalMessage)
          } else if (currentAction instanceof TalkAction) {
            // Create a new action to handle the message
            const action = new TalkAction(
              this,
              message.from,
              {
                type: "existing",
                message: message,
              },
              "We received a request to talk but were talking with sb else at the time",
            )
            const refusalMessage: ChatMessage = {
              to: message.from,
              from: this.npcConfig.username,
              message: "I'm sorry, but I'm already talking with someone else right now.",
              date: new Date().toISOString(),
            }
            this.socket.emit("sendMessage", refusalMessage)
            return this.actionManager.pushNewAction(action, 0)
          } else {
            const action = new TalkAction(this, message.from, {
              type: "existing",
              message: message,
            })
            this.actionManager.interruptCurrentActionAndExecuteNew(action)
          }
        }
      })
    })
  }

  emitUpdatePlayerData(data: UpdatePlayerData) {
    this.socket.emit("updatePlayerData", data)
  }

  sendMoveMessage(blockingPlayer: PlayerData) {
    const replyMessage: ChatMessage = {
      from: this.playerData.username,
      to: blockingPlayer.username,
      message: "Please move, you're blocking my path.",
      date: new Date().toISOString(),
    }

    this.aiBrain.memory.conversations.addChatMessage(blockingPlayer.username, replyMessage)
    this.aiBrain.memory.conversations.addAIMessage(blockingPlayer.username, {
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

      await this.actionManager.update(deltaTime)
    }, 1000 / 30)
  }
}

for (const config of npcConfig) {
  new NPC(config)
}
