import { CONFIG } from "../shared/config"
import {
  createRandomSpriteDefinition,
  getActionSchema,
  getBroadcastAnnouncementsKey,
  getDirection,
  get_move_message,
} from "../shared/functions"
import logger from "../shared/logger"
import { Tables } from "../shared/supabase-types"
import { ChatMessage, MapData, NewsItem, PlayerData, PlayerSpriteDefinition, UpdatePlayerData } from "../shared/types"
import { MovementController } from "./MovementController"
import { SocketManager } from "./SocketManager"
import { BroadcastAction } from "./actions/BroadcastAction"
import { TIMEOUT_MESSAGE, TalkAction } from "./actions/TalkAction"
import { AIBrain } from "./brain/AIBrain"
import { PromptSystem } from "./prompts"

export class NPC {
  id: number
  movementController: MovementController
  aiBrain: AIBrain
  playerData: PlayerData
  private otherPlayers: Map<string, PlayerData>
  private newsPaper: NewsItem[]
  private broadcastAnnouncements: Set<string>
  private lastUpdateTime: number
  private places: Map<string, { x: number; y: number }>
  private socketManager: SocketManager
  private updateLoopInterval: NodeJS.Timeout | null = null
  private promptSystem: PromptSystem

  constructor(
    private npcConfig: Tables<"npc">,
    private roomId: string,
    scenario: string,
    private mapConfig: Tables<"map">,
    private mapData: MapData,
    instanceId?: string,
    private reflections?: string[],
    initialPosition?: { x: number; y: number },
  ) {
    this.id = npcConfig.id
    this.promptSystem = new PromptSystem(scenario, mapConfig.name, mapConfig.description)
    this.otherPlayers = new Map<string, PlayerData>()
    this.newsPaper = []
    this.broadcastAnnouncements = new Set<string>()
    this.lastUpdateTime = Date.now()
    this.setupPlaces()
    this.socketManager = new SocketManager({
      roomId: this.roomId,
      username: this.npcConfig.name,
      spriteDefinition: createRandomSpriteDefinition(), //this.npcConfig.sprite_definition as PlayerSpriteDefinition,
      setupPlayers: this.setupPlayers.bind(this),
      onPlayerJoined: this.onPlayerJoined.bind(this),
      onPlayerDataChanged: this.onPlayerDataChanged.bind(this),
      onEndConversation: this.onEndConversation.bind(this),
      onPlayerLeft: this.onPlayerLeft.bind(this),
      onNewMessage: this.onNewMessage.bind(this),
      onNews: this.onNews.bind(this),
      adjustDirection: this.adjustDirection.bind(this),
      adjustDirectionPlace: this.adjustDirectionPlace.bind(this),
      instanceId: instanceId,
      initialPosition: initialPosition,
    })
  }

  setupPlayers(players: PlayerData[], playerId: string) {
    players.forEach(async (player) => {
      if (player.id === playerId) {
        this.playerData = player
        this.movementController = new MovementController(
          this.mapData,
          () => this.playerData,
          () => this.otherPlayers,
          this.sendMoveMessage.bind(this),
          (playerData: UpdatePlayerData) => this.updateAndEmitPlayerData(playerData),
        )

        this.socketManager.emitUpdatePlayerData({
          npcState: {
            backstory: [this.npcConfig.backstory],
          },
        })

        logger.info(`(${this.npcConfig.name}) NPC initialized`)

        try {
          this.aiBrain = new AIBrain({
            name: this.npcConfig.name,
            backstory: [this.npcConfig.backstory],
            getAvailableActions: () => this.npcConfig.available_actions.map((action) => getActionSchema(action)),
            getOtherPlayers: () => this.otherPlayers,
            getPlayerData: () => this.playerData,
            getNewsPaper: () => this.newsPaper,
            getBroadcastAnnouncements: () => this.broadcastAnnouncements,
            getMovementController: () => this.movementController,
            getPromptSystem: () => this.promptSystem,
            places: Array.from(this.places.keys()),
            getEmitMethods: () => this.socketManager.getEmitMethods(),
            adjustDirection: (username: string) => this.adjustDirection(username),
            mapConfig: this.mapConfig,
            reflections: this.reflections,
          })

          this.aiBrain.generatePlanAndSetActions()
          this.startUpdateLoop()
        } catch (error) {
          logger.error(`(${this.npcConfig.name}) Error initializing NPC`)
          console.error(error)
        }
      } else {
        this.otherPlayers.set(player.username, player)
      }
    })
  }

  onPlayerDataChanged(player: PlayerData) {
    if (player.username !== this.npcConfig.name) {
      this.otherPlayers.set(player.username, player)
    }
  }

  onEndConversation(message: ChatMessage) {
    if (message.to === this.npcConfig.name) {
      const currentAction = this.aiBrain.getCurrentAction()

      // log_threads(this.aiBrain.getBrainDump(), message.from)

      if (currentAction instanceof TalkAction && currentAction.getTargetPlayerUsername() === message.from) {
        currentAction.markAsCompleted()
        this.adjustDirection(message.from)
        this.aiBrain.addChatMessage(message.from, message)
        this.aiBrain.closeThread(message.from)
      } else if (
        currentAction instanceof TalkAction &&
        message.message === TIMEOUT_MESSAGE &&
        currentAction.getTargetPlayerUsername() !== message.from
      ) {
        logger.error(
          `(${this.npcConfig.name}) Received conversation timeout message but we are not talking with this player, message: ${JSON.stringify(message)}`,
        )
        logger.debug(`Currently talking with ${currentAction.getTargetPlayerUsername()}`)
        logger.debug(`Reflections are ${this.aiBrain.getStringifiedBrainDump().reflections}`)
        logger.debug(`Plan are ${JSON.stringify(this.aiBrain.getStringifiedBrainDump().currentPlan)}`)
        // log_threads(this.aiBrain.getBrainDump(), message.from)
        logger.error("Received conversation timeout message but we are not talking with this player")
        // throw new Error("Received conversation timeout message but we are not talking with this player")
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
    if (message.to === this.npcConfig.name) {
      // Check if we're already in a TalkAction with this person
      this.adjustDirection(message.from)
      const currentAction = this.aiBrain.getCurrentAction()

      if (currentAction instanceof TalkAction && currentAction.getTargetPlayerUsername() === message.from) {
        logger.debug(
          `(${this.npcConfig.name}) Received message from ${message.from} ${message.message} while talking with them`,
        )
        // Update the current TalkAction with the new message
        currentAction.handleMessage(message)
      } else if (currentAction instanceof BroadcastAction) {
        logger.debug(`(${this.npcConfig.name}) Received message from ${message.from} while broadcasting`)
        // TODO: figure out whether we want to save talk aproach in memory and come back to the person, I think no
        const refusalMessage: ChatMessage = {
          to: message.from,
          from: this.npcConfig.name,
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
          this.promptSystem,
        )
        const refusalMessage: ChatMessage = {
          to: message.from,
          from: this.npcConfig.name,
          message: `Sorry ${message.from}, I'm already talking with ${currentAction.getTargetPlayerUsername()} right now.`,
          date: new Date().toISOString(),
        }
        this.socketManager.emitEndConversation(refusalMessage)
        logger.debug(
          `(${this.npcConfig.name}) Refused to talk with ${message.from} while talking with ${currentAction.getTargetPlayerUsername()}`,
        )
        return this.aiBrain.pushNewAction(action, 0)
      } else {
        const currentActionName = this.aiBrain.getCurrentAction()
          ? this.aiBrain.getCurrentAction()!.constructor.name
          : "no action"
        logger.debug(`(${this.npcConfig.name}) Received message from ${message.from} while doing ${currentActionName}`)
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
          this.promptSystem,
        )
        this.aiBrain.interruptCurrentActionAndExecuteNew(action)
      }
    }
  }

  onNews(news: NewsItem | NewsItem[]) {
    if (!(news instanceof Array)) {
      if (news.message.includes("broadcasting")) {
        const key = getBroadcastAnnouncementsKey(news.place!, news.message.split(" ")[1])
        if (news.message.includes("will be")) this.broadcastAnnouncements.add(key)
        if (news.message.includes("finished")) this.broadcastAnnouncements.delete(key)
        // logger.debug(`(${this.npcConfig.name}) Broadcasting: ${JSON.stringify([...this.broadcastAnnouncements])}`)
      }
    }

    const newsArray = Array.isArray(news) ? news : [news]
    this.newsPaper = [...this.newsPaper, ...newsArray]
  }

  sendMoveMessage(blockingPlayer: PlayerData) {
    const talkAction = new TalkAction(
      this.aiBrain.getBrainDump,
      () => this.socketManager.getEmitMethods(),
      "",
      blockingPlayer.username,
      {
        type: "new",
        message: get_move_message(blockingPlayer.username),
      },
      this.movementController,
      this.promptSystem,
    )
    this.aiBrain.interruptCurrentActionAndExecuteNew(talkAction)
  }

  setupPlaces() {
    const places = this.mapData.layers.find((layer) => layer.name === CONFIG.MAP_PLACES_LAYER_NAME)!.objects!

    this.places = new Map(
      places
        .filter((obj) => !obj.name.endsWith("(podium)"))
        .map((obj) => [obj.name, { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 }]),
    )
  }

  private startUpdateLoop() {
    this.updateLoopInterval = setInterval(async () => {
      if (!this.playerData) return

      const now = Date.now()
      const deltaTime = now - this.lastUpdateTime
      this.lastUpdateTime = now

      await this.aiBrain.update(deltaTime)
    }, 1000 / 30)
  }

  private stopUpdateLoop() {
    if (this.updateLoopInterval) {
      clearInterval(this.updateLoopInterval)
      this.updateLoopInterval = null
    }
  }
  cleanup() {
    this.stopUpdateLoop()
    this.socketManager.disconnect()
  }
}
