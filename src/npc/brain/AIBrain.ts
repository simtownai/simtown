import { ChatMessage, PlayerData, UpdatePlayerData } from "../../shared/types"
import { MovementController } from "../MovementController"
import { EmitInterface } from "../SocketManager"
import { Action } from "../actions/Action"
import { NpcConfig } from "../npcConfig"
import { generatePlanForTheday } from "../plan/generatePlan"
import {
  convertActionToGeneratedAction,
  convertActionsToGeneratedPlan,
  convertGeneratedPlanToActions,
} from "../plan/helpers"
import { Thread } from "./memory/ConversationMemory"
import { Memory } from "./memory/Memory"
import { reflect } from "./reflect"
import { ChatCompletionMessageParam } from "openai/resources/index.mjs"

export type StringifiedBrainDump = {
  name: string
  backstory: string
  playerNames: string
  placesNames: string
  reflections: string
  currentPlan: string
  currentAction: string
}

export type BrainDump = {
  currentAction: Action | null
  playerData: PlayerData
  otherPlayers: Map<string, PlayerData>
  getLatestThread: (playerName: string) => Thread
  getStringifiedBrainDump: () => StringifiedBrainDump
  getNewestActiveThread: (playerName: string) => Thread
  isLatestThreadActive: (playerName: string) => boolean
  addChatMessage: (playerName: string, message: ChatMessage) => void
  addAIMessage: (playerName: string, message: ChatCompletionMessageParam) => void
  closeThread: (playerName: string) => void
}

type AIBrainInterface = {
  getPlayerData: () => PlayerData
  config: NpcConfig
  getOtherPlayers: () => Map<string, PlayerData>
  getMovementController: () => MovementController
  setAndEmitPlayerData: (playerData: PlayerData) => void
  places: string[]
  getEmitMethods: () => EmitInterface
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
  private getMovementController: () => MovementController
  private setAndEmitPlayerData: (playerData: PlayerData) => void
  private getEmitMethods: () => EmitInterface

  constructor(args: AIBrainInterface) {
    this.getEmitMethods = args.getEmitMethods
    this.npcConfig = args.config
    this.memory = new Memory(args.config)
    this.places = args.places
    this.getOtherPlayers = args.getOtherPlayers
    this.getPlayerData = args.getPlayerData
    this.setAndEmitPlayerData = args.setAndEmitPlayerData
    this.getMovementController = args.getMovementController
  }

  async generatePlanAndSetActions() {
    try {
      const initialPlanData = await generatePlanForTheday(
        this.getStringifiedBrainDump(),
        Array.from(this.getOtherPlayers().keys()),
        this.places,
      )
      const movementController = this.getMovementController()
      this.actionQueue = convertGeneratedPlanToActions(
        initialPlanData,
        this.getBrainDump,
        this.getEmitMethods,
        movementController,
        this.setAndEmitPlayerData,
      )
    } catch (error) {
      console.error("Error generating new plan:", error)
    }
  }

  getBrainDump = (): BrainDump => {
    return {
      closeThread: (targetPlayerName: string) => this.closeThread(targetPlayerName),
      currentAction: this.currentAction,
      playerData: this.getPlayerData(),
      otherPlayers: this.getOtherPlayers(),
      getLatestThread: (targetPlayerName: string) => this.memory.conversations.getLatestThread(targetPlayerName),
      getStringifiedBrainDump: () => this.getStringifiedBrainDump(),
      getNewestActiveThread: (targetPlayerName: string) =>
        this.memory.conversations.getNewestActiveThread(targetPlayerName),
      isLatestThreadActive: (targetPlayerName: string) =>
        this.memory.conversations.isLatestThreadActive(targetPlayerName),
      addChatMessage: (targetPlayerName: string, message: ChatMessage) =>
        this.addChatMessage(targetPlayerName, message),
      addAIMessage: (targetPlayerName: string, message: ChatCompletionMessageParam) =>
        this.addAIMessage(targetPlayerName, message),
    }
  }

  getStringifiedBrainDump(): StringifiedBrainDump {
    const backstory = this.npcConfig.backstory.join(" ")
    const name = this.npcConfig.username
    const playerNames = Array.from(this.getOtherPlayers().keys())
    const playerNamesString =
      playerNames.length > 0 ? `Available players: ${playerNames.join(", ")}` : "No other players available"
    const placesNames = this.places
    const placesNamesString =
      placesNames.length > 0 ? `Available places: ${placesNames.join(", ")}` : "No other places available"
    const reflections = this.memory.reflections
    const reflectionsString =
      reflections.length > 0 ? `Reflections: ${reflections}` : "We are just starting our day, no reflections"
    const currentActionQueue = this.actionQueue
    const currentActionQueueString =
      currentActionQueue.length > 0
        ? `Current plan is: ${JSON.stringify(convertActionsToGeneratedPlan(currentActionQueue))}`
        : "We don't have a plan yet"
    const currentActionString = this.currentAction
      ? JSON.stringify(convertActionToGeneratedAction(this.currentAction))
      : "No current action"

    const result: StringifiedBrainDump = {
      name,
      backstory,
      playerNames: playerNamesString,
      placesNames: placesNamesString,
      reflections: reflectionsString,
      currentPlan: currentActionQueueString,
      currentAction: currentActionString,
    }
    return result
  }

  pushNewAction(action: Action, index: number): string {
    this.actionQueue.splice(index, 0, action)
    console.log(`Inserted new action at index ${index}:`, action.constructor.name)
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
      console.log("No more actions planned")
      return
    }

    this.currentAction = nextAction
    console.error("Starting next action:", nextAction.constructor.name)

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
      // Process reflection
      const reflections = await reflect(this.currentAction)
      if (!reflections) {
        throw new Error(`Could not reflect for completed action: ${this.currentAction.constructor.name}`)
      }

      this.memory.reflections.push(reflections)

      await this.generatePlanAndSetActions()

      // Clear the current action
      this.currentAction = null

      // Start the next action
      await this.startNextAction()
    } catch (error) {
      console.error("Error during action completion:", error)
      this.currentAction = null
    }
  }

  public async interruptCurrentActionAndExecuteNew(newAction: Action) {
    if (this.currentAction) {
      this.currentAction.interrupt()
      const reflections = await reflect(this.currentAction)
      if (!reflections) {
        throw new Error(`Could not reflect for interrupted action: ${this.currentAction.constructor.name}`)
      }
      this.memory.reflections.push(reflections)
      // Add the interrupted action back to the front of the queue
      this.actionQueue.unshift(this.currentAction)
      this.currentAction = null
    }

    // Start the new action immediately
    this.currentAction = newAction
    this.getEmitMethods().updatePlayerData({
      action: convertActionToGeneratedAction(this.currentAction),
    })

    this.currentAction.start()
  }
  getCurrentAction() {
    return this.currentAction
  }

  addChatMessage(targetPlayerUsername: string, message: ChatMessage) {
    this.memory.conversations.addChatMessage(targetPlayerUsername, message)
  }
  addAIMessage(targetPlayerUsername: string, message: ChatCompletionMessageParam) {
    this.memory.conversations.addAIMessage(targetPlayerUsername, message)
  }
  closeThread(targetPlayerUsername: string) {
    this.memory.conversations.closeThread(targetPlayerUsername)
  }
}
