import mapData from "../../public/assets/maps/simple-map.json"
import { ChatMessage, NewsItem, PlayerData, UpdatePlayerData } from "../shared/types"
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
  private newsPaper: NewsItem[]
  private lastUpdateTime: number
  private placesNames: string[]
  private socketManager: SocketManager

  constructor(private npcConfig: NpcConfig) {
    this.otherPlayers = new Map<string, PlayerData>()
    this.newsPaper = []
    this.lastUpdateTime = Date.now()
    this.placesNames = mapData.layers.find((layer) => layer.name === "Boxes")!.objects!.map((obj) => obj.name)
    this.socketManager = new SocketManager({
      username: this.npcConfig.username,
      spriteDefinition: this.npcConfig.spriteDefinition,
      setupPlayers: this.setupPlayers.bind(this),
      onPlayerJoined: this.onPlayerJoined.bind(this),
      onPlayerDataChanged: this.onPlayerDataChanged.bind(this),
      onEndConversation: this.onEndConversation.bind(this),
      onPlayerLeft: this.onPlayerLeft.bind(this),
      onNewMessage: this.onNewMessage.bind(this),
      onNews: this.onNews.bind(this),
    })
  }

  setupPlayers(players: PlayerData[], playerId: string) {
    players.forEach(async (player) => {
      if (player.id === playerId) {
        this.playerData = player
        this.movementController = new MovementController(
          () => this.playerData,
          () => this.otherPlayers,
          this.sendMoveMessage.bind(this),
          (playerData: UpdatePlayerData) => this.updateAndEmitPlayerData(playerData),
        )

        setTimeout(async () => {
          try {
            this.aiBrain = new AIBrain({
              config: this.npcConfig,
              getOtherPlayers: () => this.otherPlayers,
              getPlayerData: () => this.playerData,
              getNewsPaper: () => this.newsPaper,
              getMovementController: () => this.movementController,
              places: this.placesNames,
              setAndEmitPlayerData: (playerData: PlayerData) => this.updateAndEmitPlayerData(playerData),
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
    if (player.username !== this.npcConfig.username) {
      this.otherPlayers.set(player.username, player)
    }
  }
  onEndConversation(message: ChatMessage) {
    console.log("onEndConversation", message)
    if (message.to === this.npcConfig.username) {
      this.aiBrain.addChatMessage(message.from, message)
      this.aiBrain.addAIMessage(message.from, {
        role: "user",
        content: message.message,
      })
      const currentAction = this.aiBrain.getCurrentAction()
      if (currentAction instanceof TalkAction) {
        currentAction.clearAllListenersAndMarkAsCompleted()
      }
      console.error(
        "Received end conversation message from",
        message.from,
        "action is",
        this.aiBrain.getCurrentAction()?.isCompleted(),
      )
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

  updateAndEmitPlayerData(updatePlayerData: UpdatePlayerData) {
    this.playerData = { ...this.playerData, ...updatePlayerData }
    this.socketManager.emitUpdatePlayerData(updatePlayerData)
  }

  onNewMessage(message: ChatMessage) {
    if (message.to === this.npcConfig.username) {
      // Check if we're already in a TalkAction with this person
      const currentAction = this.aiBrain.getCurrentAction()

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
        this.socketManager.emitEndConversation(refusalMessage)
        return this.aiBrain.pushNewAction(action, 0)
      } else {
        const action = new TalkAction(
          this.aiBrain.getBrainDump,
          () => this.socketManager.getEmitMethods(),
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
  }

  onNews(news: NewsItem | NewsItem[]) {
    const newsArray = Array.isArray(news) ? news : [news]
    this.newsPaper = [...this.newsPaper, ...newsArray]
    console.log("onNews", news)
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
