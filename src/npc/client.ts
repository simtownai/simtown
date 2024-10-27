import mapData from "../../public/assets/maps/simple-map.json"
import { ChatMessage, PlayerData } from "../shared/types"
import { MovementController } from "./MovementController"
import { SocketManager } from "./SocketManager"
import { BroadcastAction } from "./actions/BroadcastAction"
import { TalkAction } from "./actions/TalkAction"
import { AIBrain } from "./brain/AIBrain"
import { NpcConfig, npcConfig } from "./npcConfig"

export class NPC {
  movementController: MovementController
  aiBrain: AIBrain
  private playerData: PlayerData
  private otherPlayers: Map<string, PlayerData>
  private lastUpdateTime: number
  private placesNames: string[]
  private socketManager: SocketManager

  constructor(private npcConfig: NpcConfig) {
    this.otherPlayers = new Map()
    this.lastUpdateTime = Date.now()
    this.placesNames = mapData.layers.find((layer) => layer.name === "Boxes")!.objects!.map((obj) => obj.name)
    this.socketManager = new SocketManager({
      getBrainDump: () => this.aiBrain.getBrainDump(),
      setupPlayers: this.setupPlayers,
      onPlayerJoined: this.onPlayerJoined,
      onPlayerDataChanged: this.onPlayerDataChanged,
      onEndConversation: this.onEndConversation,
      onPlayerLeft: this.onPlayerLeft,
      onNewMessage: this.onNewMessage,
    })
  }

  setupPlayers(players: PlayerData[], playerId: string) {
    players.forEach(async (player) => {
      if (player.id === playerId) {
        this.playerData = player
        this.movementController = new MovementController(
          this.playerData,
          this.otherPlayers,
          this.sendMoveMessage.bind(this),
          this.socketManager.getEmitMethods().updatePlayerData.bind(this),
        )

        setTimeout(async () => {
          try {
            this.aiBrain = new AIBrain({
              config: this.npcConfig,
              getOtherPlayers: () => this.otherPlayers,
              getPlayerData: () => this.playerData,
              getMovementController: () => this.movementController,
              places: this.placesNames,
              setAndEmitPlayerData: (playerData: PlayerData) =>
                this.socketManager.getEmitMethods().updatePlayerData(playerData),
              getEmitMethods: () => this.socketManager.getEmitMethods(),
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
  }
  onPlayerDataChanged(player: PlayerData) {
    if (player.id !== this.playerData.id) {
      this.otherPlayers.set(player.username, player)
    }
  }
  onEndConversation(message: ChatMessage) {
    if (message.to === this.npcConfig.username) {
      this.aiBrain.addChatMessage(message.from, message)
      this.aiBrain.addAIMessage(message.from, {
        role: "user",
        content: message.message,
      })
      this.aiBrain.closeThread(message.from)
    }
  }

  onPlayerLeft(username: string) {
    this.otherPlayers.delete(username)
  }

  onPlayerJoined(player: PlayerData) {
    if (!this.playerData || player.id !== this.playerData.id) {
      this.otherPlayers.set(player.username, player)
    }
  }

  setAndEmitPlayerData(playerData: PlayerData) {
    this.playerData = playerData
    this.socketManager.getEmitMethods().updatePlayerData(playerData)
  }

  onNewMessage(message: ChatMessage) {
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
        this.socketManager.emitEndConversation(refusalMessage)
      } else if (currentAction instanceof TalkAction) {
        // Create a new action to handle the message
        const action = new TalkAction(
          this.aiBrain.getBrainDump,
          () => this.socketManager.getEmitMethods(),
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
        this.socketManager.emitSendMessage(refusalMessage)
        return this.aiBrain.pushNewAction(action, 0)
      } else {
        const action = new TalkAction(
          this.aiBrain.getBrainDump,
          () => this.socketManager.getEmitMethods(),
          message.from,
          {
            type: "existing",
            message: message,
          },
        )
        this.aiBrain.interruptCurrentActionAndExecuteNew(action)
      }
    }
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
    this.socketManager.emitSendMessage(replyMessage)
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
