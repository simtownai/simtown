import { CONFIG } from "../shared/config"
import { getDirection } from "../shared/functions"
import logger from "../shared/logger"
import { ChatMessage, NewsItem, PlayerData, UpdatePlayerData } from "../shared/types"
import { MovementController } from "./MovementController"
import { SocketManager } from "./SocketManager"
import { BroadcastAction } from "./actions/BroadcastAction"
import { TIMEOUT_MESSAGE, TalkAction } from "./actions/TalkAction"
import { AIBrain } from "./brain/AIBrain"
import { log_threads } from "./loghelpers"
import { NpcConfig, npcConfig } from "./npcConfig"

export class NPC {
  movementController: MovementController
  aiBrain: AIBrain
  private playerData: PlayerData
  private otherPlayers: Map<string, PlayerData>
  private newsPaper: NewsItem[]
  private lastUpdateTime: number
  private places: Map<string, { x: number; y: number }>
  private socketManager: SocketManager

  constructor(private npcConfig: NpcConfig) {
    this.otherPlayers = new Map<string, PlayerData>()
    this.newsPaper = []
    this.lastUpdateTime = Date.now()
    this.setupPlaces()
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
      adjustDirection: this.adjustDirection.bind(this),
      adjustDirectionPlace: this.adjustDirectionPlace.bind(this),
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

        logger.info(`(${this.npcConfig.username}) NPC initialized`)

        setTimeout(async () => {
          try {
            this.aiBrain = new AIBrain({
              config: this.npcConfig,
              getOtherPlayers: () => this.otherPlayers,
              getPlayerData: () => this.playerData,
              getNewsPaper: () => this.newsPaper,
              getMovementController: () => this.movementController,
              places: Array.from(this.places.keys()),
              getEmitMethods: () => this.socketManager.getEmitMethods(),
              adjustDirection: (username: string) => this.adjustDirection(username),
            })

            this.aiBrain.generatePlanAndSetActions()
            this.startUpdateLoop()
          } catch (error) {
            logger.error(`(${this.npcConfig.username}) Error initializing NPC`)
            console.error(error)
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
    if (message.to === this.npcConfig.username) {
      const currentAction = this.aiBrain.getCurrentAction()

      log_threads(this.aiBrain.getBrainDump(), message.from)

      if (currentAction instanceof TalkAction && currentAction.getTargetPlayerUsername() === message.from) {
        currentAction.clearAllListeners()
        currentAction.markAsCompleted()
        this.adjustDirection(message.from)
        this.aiBrain.addChatMessage(message.from, message)
        this.aiBrain.addAIMessage(message.from, {
          role: "user",
          content: message.message,
        })
        this.aiBrain.closeThread(message.from)
      } else if (
        currentAction instanceof TalkAction &&
        message.message === TIMEOUT_MESSAGE &&
        currentAction.getTargetPlayerUsername() !== message.from
      ) {
        logger.error(
          `(${this.npcConfig.username}) Received conversation timeout message but we are not talking with this player, message: ${JSON.stringify(message)}`,
        )
        logger.debug(`Currently talking with ${currentAction.getTargetPlayerUsername()}`)
        logger.debug(`Reflections are ${this.aiBrain.getStringifiedBrainDump().reflections}`)
        logger.debug(`Plan are ${JSON.stringify(this.aiBrain.getStringifiedBrainDump().currentPlan)}`)
        log_threads(this.aiBrain.getBrainDump(), message.from)
        throw new Error("Received conversation timeout message but we are not talking with this player")
      }
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

  adjustDirection(username: string) {
    const otherPlayerData = this.otherPlayers.get(username)
    if (!otherPlayerData) return

    const dx = otherPlayerData.x - this.playerData.x
    const dy = otherPlayerData.y - this.playerData.y

    const direction = getDirection(dx, dy)

    const animation = `${this.playerData.username}-idle-${direction}`
    this.updateAndEmitPlayerData({ animation })
  }

  adjustDirectionPlace(place: string) {
    const placeData = this.places.get(place)
    if (!placeData) return

    const dx = placeData.x - this.playerData.x
    const dy = placeData.y - this.playerData.y

    const direction = getDirection(dx, dy)

    const animation = `${this.playerData.username}-idle-${direction}`
    this.updateAndEmitPlayerData({ animation })
  }

  updateAndEmitPlayerData(updatePlayerData: UpdatePlayerData) {
    this.playerData = { ...this.playerData, ...updatePlayerData }
    this.socketManager.emitUpdatePlayerData(updatePlayerData)
  }

  onNewMessage(message: ChatMessage) {
    if (message.to === this.npcConfig.username) {
      // Check if we're already in a TalkAction with this person
      this.adjustDirection(message.from)
      const currentAction = this.aiBrain.getCurrentAction()

      if (currentAction instanceof TalkAction && currentAction.getTargetPlayerUsername() === message.from) {
        logger.debug(`(${this.npcConfig.username}) Received message from ${message.from} while talking with them`)
        // Update the current TalkAction with the new message
        currentAction.handleMessage(message)
      } else if (currentAction instanceof BroadcastAction) {
        logger.debug(`(${this.npcConfig.username}) Received message from ${message.from} while broadcasting`)
        // TODO: figure out whether we want to save talk aproach in memory and come back to the person, I think no
        const refusalMessage: ChatMessage = {
          to: message.from,
          from: this.npcConfig.username,
          message: `Sorry ${message.from}, I'm in the middle of broadcasting at ${currentAction.targetPlace} right now.`,
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
          this.movementController,
        )
        const refusalMessage: ChatMessage = {
          to: message.from,
          from: this.npcConfig.username,
          message: `Sorry ${message.from}, I'm already talking with ${currentAction.getTargetPlayerUsername()} right now.`,
          date: new Date().toISOString(),
        }
        this.socketManager.emitEndConversation(refusalMessage)
        logger.debug(
          `(${this.npcConfig.username}) Refused to talk with ${message.from} while talking with ${currentAction.getTargetPlayerUsername()}`,
        )
        return this.aiBrain.pushNewAction(action, 0)
      } else {
        const currentActionName = this.aiBrain.getCurrentAction()
          ? this.aiBrain.getCurrentAction()!.constructor.name
          : "no action"
        logger.debug(
          `(${this.npcConfig.username}) Received message from ${message.from} while doing ${currentActionName}`,
        )
        const action = new TalkAction(
          this.aiBrain.getBrainDump,
          () => this.socketManager.getEmitMethods(),
          "",
          message.from,
          {
            type: "existing",
            message: message,
          },
          this.movementController,
        )
        this.aiBrain.interruptCurrentActionAndExecuteNew(action)
      }
    }
  }

  onNews(news: NewsItem | NewsItem[]) {
    const newsArray = Array.isArray(news) ? news : [news]
    this.newsPaper = [...this.newsPaper, ...newsArray]
  }

  sendMoveMessage(blockingPlayer: PlayerData) {
    const message = `Hey ${blockingPlayer.username}, you're blocking my path.`
    const replyMessage: ChatMessage = {
      from: this.playerData.username,
      to: blockingPlayer.username,
      message: message,
      date: new Date().toISOString(),
    }
    this.aiBrain.addChatMessage(blockingPlayer.username, replyMessage)
    this.aiBrain.addAIMessage(blockingPlayer.username, {
      role: "assistant",
      content: message,
    })
    this.socketManager.emitSendMessage(replyMessage)
  }

  setupPlaces() {
    const places = CONFIG.MAP_DATA.layers.find((layer) => layer.name === CONFIG.PLACES_LAYER_NAME)!.objects!

    this.places = new Map(
      places
        .filter((obj) => !obj.name.endsWith("(podium)"))
        .map((obj) => [obj.name, { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 }]),
    )
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
