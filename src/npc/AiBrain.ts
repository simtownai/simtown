import { PlayerData } from "../shared/types"
import { ActionManager } from "./ActionManager"
import { Memory } from "./memory"
import { NPCConfig } from "./npcConfig"
import { createPlanDataFromActions, transformActionToActionPlan } from "./planningHelpers"

export interface FunctionSchema {
  type: string
  function: {
    name: string
    description: string
    parameters: {
      type: string
      properties: { [key: string]: any }
      required: string[]
    }
  }
}

export class AiBrain {
  memory: Memory

  constructor(
    private npcConfig: NPCConfig,
    private otherPlayers: Map<string, PlayerData>,
    private places: string[],
    private actionManager: ActionManager,
  ) {
    this.memory = new Memory(npcConfig)
  }

  getNPCMemories(): AiBrainReflections {
    const backstory = this.npcConfig.backstory.join(" ")
    const name = this.npcConfig.username
    const playerNames = Array.from(this.otherPlayers.keys())
    const playerNamesString =
      playerNames.length > 0 ? `Available players: ${playerNames.join(", ")}` : "No other players available"
    const placesNames = this.places
    const placesNamesString =
      placesNames.length > 0 ? `Available places: ${placesNames.join(", ")}` : "No other places available"
    const reflections = this.memory.reflections
    const reflectionsString =
      reflections.length > 0 ? `Reflections: ${reflections}` : "We are just starting our day, no reflections"
    const currentActionQueue = this.actionManager.actionQueue
    const currentActionQueueString =
      currentActionQueue.length > 0
        ? `Current plan is: ${JSON.stringify(createPlanDataFromActions(currentActionQueue))}`
        : "We don't have a plan yet"
    const currentAction = this.actionManager.getCurrentAction()
    const currentActionString = currentAction
      ? JSON.stringify(transformActionToActionPlan(currentAction))
      : "No current action"

    const result: AiBrainReflections = {
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

  // Async initialization method

  async plan() {
    // Implementation for planning (if needed)
  }
}
export type AiBrainReflections = {
  name: string
  backstory: string
  playerNames: string
  placesNames: string
  reflections: string
  currentPlan: string
  currentAction: string
}
