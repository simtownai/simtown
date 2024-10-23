import { ActionPlan, Action as ActionType, UpdatePlayerData } from "../shared/types"
import { generatePlanForTheday } from "./Plan"
import { Action } from "./actions/Action"
import { IdleAction } from "./actions/IdleAction"
import { MoveAction } from "./actions/MoveAction"
import { TalkAction } from "./actions/TalkAction"
import { NPC } from "./client"
import { transformActionToActionPlan } from "./planningHelpers"
import { reflect } from "./reflect"

// Assuming you have a plan function that generates plans based on reflections

export class ActionManager {
  private currentAction: Action | null = null
  private actionQueue: Action[] = []
  private npc: NPC
  private isProcessingAction: boolean = false

  constructor(npc: NPC) {
    this.npc = npc
    this.generatePlanAndSetActions()
  }

  /**
   * Generates the initial plan for the day and seeds the action queue
   */
  private async generatePlanAndSetActions(currentActionQueue: Action[] = [], reflections: string[] = []) {
    console.log("================================")
    console.log("Generating new plan for the day")
    console.log("================================")

    try {
      const initialPlanData = await generatePlanForTheday(
        this.npc.npcConfig,
        Array.from(this.npc.otherPlayers.keys()),
        this.npc.objectLayer!.map((obj) => obj.name),
        currentActionQueue,
        reflections,
      )
      this.actionQueue = this.createActionsFromPlanData(initialPlanData)
      // console.log("Generated new plan for the day:", initialPlanData)
    } catch (error) {
      console.error("Error generating new plan:", error)
    }
  }

  /**
   * Converts plan data into Action instances
   */
  private createActionsFromPlanData(planData: ActionPlan): Action[] {
    return planData.map((actionData: ActionType) => {
      switch (actionData.type) {
        case "idle":
          return new IdleAction(this.npc)
        case "move":
          return new MoveAction(this.npc, actionData.target)
        case "talk":
          return new TalkAction(this.npc, actionData.name, { type: "new" })
        default:
          console.warn("Unknown action type:", actionData)
          return new IdleAction(this.npc) // Fallback action
      }
    })
  }

  getCurrentAction(): Action | null {
    return this.currentAction
  }

  /**
   * Inserts a new action into the queue at the specified index
   */
  pushNewAction(action: Action, index: number): string {
    this.actionQueue.splice(index, 0, action)
    console.log(`Inserted new action at index ${index}:`, action.constructor.name)
    return `Inserted new action at index ${index}: ${action.constructor.name}`
  }

  /**
   * Updates the current action and manages action transitions
   */
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

  /**
   * Handles the completion of the current action, ensuring reflection is completed
   * before moving to the next action
   */

  /**
   * Starts the next action from the action queue
   */
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
    // console.log("Starting next action:", nextAction.constructor.name)

    this.npc.socket.emit("updatePlayerData", {
      action: transformActionToActionPlan(this.currentAction),
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
      console.log("Starting reflection for:", this.currentAction.constructor.name)
      const reflections = await reflect(this.currentAction)
      if (!reflections) {
        throw new Error(`Could not reflect for action: ${this.currentAction.constructor.name}`)
      }

      // console.log("Processing reflections:", reflections)

      this.npc.aiBrain.memory.reflections.push(reflections)

      await this.generatePlanAndSetActions(this.actionQueue, this.npc.aiBrain.memory.reflections)

      // Clear the current action
      this.currentAction = null

      // Start the next action
      await this.startNextAction()
    } catch (error) {
      console.error("Error during action completion:", error)
      this.currentAction = null
    }
  }

  /**
   * Clears all current and planned actions
   */
  clearActions() {
    if (this.currentAction) {
      this.currentAction.interrupt()
    }
    this.currentAction = null
    this.actionQueue = []
    this.isProcessingAction = false
    console.log("All actions cleared")
  }

  public async interruptCurrentActionAndExecuteNew(newAction: Action) {
    if (this.currentAction) {
      this.currentAction.interrupt()
      // Add the interrupted action back to the front of the queue
      this.actionQueue.unshift(this.currentAction)
      this.currentAction = null
    }

    // Start the new action immediately
    this.currentAction = newAction
    console.log("Starting new action:", newAction.constructor.name)
    this.currentAction.start()
  }
}
