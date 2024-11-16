import { getGameTime } from "../../shared/functions"
import logger from "../../shared/logger"
import {
  ChatMessage,
  NewsItem,
  PlayerData,
  UpdatePlayerData,
  VoteCandidate,
  availableVoteCandidates,
} from "../../shared/types"
import { MovementController } from "../MovementController"
import { EmitInterface } from "../SocketManager"
import { Action } from "../actions/Action"
import { MoveAction } from "../actions/MoveAction"
import { NpcConfig } from "../npcConfig"
import { generatePlanForTheday } from "../plan/generatePlan"
import {
  convertActionToGeneratedAction,
  convertActionsToGeneratedPlan,
  convertGeneratedPlanToActions,
} from "../plan/helpers"
import { ConversationMemory, Thread } from "./memory/ConversationMemory"
import { Memory } from "./memory/Memory"
import { reflect, summarizeReflections } from "./reflect"

// It is here because it is shared between every NPC
// ToDo: make it individual for each NPC and update from news
const broadcastAnnouncementsCache = new Set<string>()

export type StringifiedBrainDump = {
  name: string
  backstory: string
  playerNames: string
  placesNames: string
  npcConfig: NpcConfig

  newsPaper: string
  reflections: string
  currentPlan: string
  currentAction: string
  currentTime: string
  broadcastAnnouncements: string
}

export type BrainDump = {
  conversations: ConversationMemory
  currentAction: Action | null
  playerData: PlayerData
  otherPlayers: Map<string, PlayerData>
  newsPaper: NewsItem[]
  getLatestThread: (playerName: string) => Thread
  getStringifiedBrainDump: () => StringifiedBrainDump
  getNewestActiveThread: (playerName: string) => Thread
  isLatestThreadActive: (playerName: string) => boolean
  addChatMessage: (playerName: string, message: ChatMessage) => void
  closeThread: (playerName: string) => void
  broadcastAnnouncementsCache: Set<string>
}

type AIBrainInterface = {
  getPlayerData: () => PlayerData
  config: NpcConfig
  getOtherPlayers: () => Map<string, PlayerData>
  getNewsPaper: () => NewsItem[]
  getMovementController: () => MovementController
  places: string[]
  getEmitMethods: () => EmitInterface
  adjustDirection: (username: string) => void
}

export class AIBrain {
  private memory: Memory
  private npcConfig: NpcConfig
  private actionQueue: Action[] = []
  private currentAction: Action | null = null
  private isProcessingAction: boolean = false
  private places: string[]
  private getOtherPlayers: () => Map<string, PlayerData>
  private getPlayerData: () => PlayerData
  private getNewsPaper: () => NewsItem[]
  private getMovementController: () => MovementController
  private getEmitMethods: () => EmitInterface
  private adjustDirection: (username: string) => void

  constructor(args: AIBrainInterface) {
    this.getEmitMethods = args.getEmitMethods
    this.npcConfig = args.config
    this.memory = new Memory(args.config)
    this.places = args.places
    this.getOtherPlayers = args.getOtherPlayers
    this.getPlayerData = args.getPlayerData
    this.getNewsPaper = args.getNewsPaper
    this.getMovementController = args.getMovementController
    this.adjustDirection = args.adjustDirection
  }

  async generatePlanAndSetActions() {
    try {
      const currentPlanData = convertActionsToGeneratedPlan(this.actionQueue)
      const newPlanData = await generatePlanForTheday(this.getBrainDump, this.getStringifiedBrainDump())
      // ToDo: calculate diffs of plans, generate new actions for what is not there already,
      // and insert actions from actions queue

      this.actionQueue = convertGeneratedPlanToActions(
        newPlanData,
        this.getBrainDump,
        this.getEmitMethods,
        this.getMovementController(),
        this.adjustDirection,
      )
    } catch (error) {
      logger.error(`(${this.getPlayerData().username}) Error generating new plan:`, error)
    }
  }

  getBrainDump = (): BrainDump => {
    return {
      conversations: this.memory.conversations,
      closeThread: (targetPlayerName: string) => this.closeThread(targetPlayerName),
      currentAction: this.currentAction,
      playerData: this.getPlayerData(),
      otherPlayers: this.getOtherPlayers(),
      newsPaper: this.getNewsPaper(),
      getLatestThread: (targetPlayerName: string) => this.memory.conversations.getLatestThread(targetPlayerName),
      getStringifiedBrainDump: () => this.getStringifiedBrainDump(),
      getNewestActiveThread: (targetPlayerName: string) =>
        this.memory.conversations.getNewestActiveThread(targetPlayerName),
      isLatestThreadActive: (targetPlayerName: string) =>
        this.memory.conversations.isLatestThreadActive(targetPlayerName),
      addChatMessage: (targetPlayerName: string, message: ChatMessage) =>
        this.addChatMessage(targetPlayerName, message),
      broadcastAnnouncementsCache: broadcastAnnouncementsCache,
    }
  }

  getStringifiedBrainDump(): StringifiedBrainDump {
    const backstory = this.npcConfig.backstory.join(" ")
    const name = this.npcConfig.username
    const playerNames = Array.from(this.getOtherPlayers().keys())
    const playerNamesString = playerNames.length > 0 ? `${playerNames.join(", ")}` : "No other players available"
    const placesNames = this.places
    const newsPaperString = availableVoteCandidates.includes(this.npcConfig.username as VoteCandidate)
      ? ""
      : `\n${this.getNewsPaper()
          .map((newsItem) => `${newsItem.date}: ${newsItem.message} ${newsItem.place ? `at ${newsItem.place}` : ""}`)
          .join("\n")}`
    const placesNamesString = placesNames.length > 0 ? `${placesNames.join(", ")}` : "No other places available"
    const reflections = this.memory.reflections
    const reflectionsString =
      reflections.length > 0 ? `${reflections.join("\n")}` : "We are just starting our day, no reflections"
    const currentActionQueue = this.actionQueue
    const currentActionQueueString =
      currentActionQueue.length > 0
        ? `${JSON.stringify(convertActionsToGeneratedPlan(currentActionQueue))}`
        : "We don't have a plan yet"
    const currentActionString = this.currentAction
      ? JSON.stringify(
          this.currentAction instanceof MoveAction && this.currentAction.moveTarget.targetType === "person"
            ? "We are now moving to the person so that we can talk with them"
            : convertActionToGeneratedAction(this.currentAction),
        )
      : "No current action"
    const broadcastAnnouncementsString = Array.from(broadcastAnnouncementsCache).join("\n")

    const result: StringifiedBrainDump = {
      npcConfig: this.npcConfig,
      name,
      backstory,
      playerNames: playerNamesString,
      placesNames: placesNamesString,
      newsPaper: newsPaperString,
      reflections: reflectionsString,
      currentPlan: currentActionQueueString,
      currentAction: currentActionString,
      currentTime: getGameTime().toISOString(),
      broadcastAnnouncements: broadcastAnnouncementsString,
    }
    return result
  }

  pushNewAction(action: Action, index: number): string {
    this.actionQueue.splice(index, 0, action)
    logger.info(`(${this.getPlayerData().username}) inserted new '${action.constructor.name}' at index ${index}`)
    return `Inserted new action at index ${index}: ${action.constructor.name}`
  }

  async update(deltaTime: number) {
    if (this.isProcessingAction) {
      return
    }

    // If no current action, try to start one from the queue
    if (!this.currentAction && this.actionQueue.length > 0) {
      await this.startNextAction()
      return
    }

    // Update current action if it exists
    if (this.currentAction) {
      this.currentAction.update(deltaTime)

      if (this.currentAction.isCompleted()) {
        this.isProcessingAction = true
        await this.handleActionCompletion()
        this.isProcessingAction = false
      }
    }
  }
  private async startNextAction() {
    if (this.isProcessingAction) {
      return
    }

    const nextAction = this.actionQueue.shift()

    if (!nextAction) {
      logger.warn(`(${this.getPlayerData().username}) no more actions planned`)
      return
    }

    this.currentAction = nextAction
    logger.info(`(${this.getPlayerData().username}) starting next action: ${nextAction.constructor.name}`)

    this.getEmitMethods().updatePlayerData({
      action: convertActionToGeneratedAction(this.currentAction),
    } as UpdatePlayerData)

    if (this.currentAction.isInterrupted) {
      this.currentAction.resume()
    } else {
      this.currentAction.start()
    }
  }

  private async handleActionCompletion() {
    if (!this.currentAction) {
      return
    }

    try {
      if (this.currentAction.shouldReflect) {
        const reflections = await reflect(this.currentAction)
        if (!reflections) {
          throw new Error(`Could not reflect for completed action: ${this.currentAction.constructor.name}`)
        }

        this.memory.reflections.push(reflections)

        if (this.memory.reflections.length > 10) {
          const new_reflections = await summarizeReflections(this.getStringifiedBrainDump())
          if (!new_reflections) {
            throw new Error("Could not summarize reflections")
          }
          this.memory.reflections = [new_reflections]
        }

        await this.generatePlanAndSetActions()
      } else {
        logger.debug(
          `(${this.getPlayerData().username}) not reflecting on the action '${this.currentAction.constructor.name}'`,
        )
      }
      // Clear the current action
      this.currentAction = null

      // Start the next action
      await this.startNextAction()
    } catch (error) {
      logger.error(`(${this.getPlayerData().username}) Error during action completion:`, error)
      this.currentAction = null
    }
  }

  public async interruptCurrentActionAndExecuteNew(newAction: Action) {
    if (this.currentAction) {
      this.currentAction.interrupt()
      if (this.currentAction.shouldReflect) {
        const reflections = await reflect(this.currentAction)
        if (!reflections) {
          throw new Error(`Could not reflect for interrupted action: ${this.currentAction.constructor.name}`)
        }
        this.memory.reflections.push(reflections)
      }
      // Add the interrupted action back to the front of the queue
      this.actionQueue.unshift(this.currentAction)
      this.currentAction = null
    }

    // Start the new action immediately
    this.currentAction = newAction
    this.getEmitMethods().updatePlayerData({
      action: convertActionToGeneratedAction(this.currentAction),
    } as UpdatePlayerData)

    this.currentAction.start()
  }
  getCurrentAction() {
    return this.currentAction
  }

  addChatMessage(targetPlayerUsername: string, message: ChatMessage) {
    this.memory.conversations.addChatMessage(targetPlayerUsername, message)
  }
  closeThread(targetPlayerUsername: string) {
    this.memory.conversations.closeThread(targetPlayerUsername)
  }
}
