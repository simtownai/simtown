// AiBrain.ts
import { NPC } from "./client"
import { Memory } from "./memory"
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

interface AiBrainOptions {
  npc: NPC
}
export class AiBrain {
  public memory: Memory
  npc: NPC

  constructor(options: AiBrainOptions) {
    this.memory = new Memory(options.npc.npcConfig)
    this.npc = options.npc

    // Initialize planForTheDay asynchronously
  }

  getNPCMemories() {
    const backstory = this.npc.npcConfig.backstory.join(" ")
    const name = this.npc.npcConfig.username
    const playerNames = Array.from(this.npc.otherPlayers.keys())
    const playerNamesString =
      playerNames.length > 0 ? `Available players: ${playerNames.join(", ")}` : "No other players available"
    const placesNames = this.npc.objectLayer!.map((obj) => obj.name)
    const placesNamesString =
      placesNames.length > 0 ? `Available places: ${placesNames.join(", ")}` : "No other places available"
    const reflections = this.memory.reflections
    const reflectionsString =
      reflections.length > 0 ? `Reflections: ${reflections}` : "We are just starting our day, no reflections"
    const currentActionQueue = this.npc.actionManager.actionQueue
    const currentActionQueueString =
      currentActionQueue.length > 0
        ? `Current plan is: ${JSON.stringify(createPlanDataFromActions(currentActionQueue))}`
        : "We don't have a plan yet"
    const currentAction = this.npc.actionManager.getCurrentAction()
    const currentActionString = currentAction
      ? JSON.stringify(transformActionToActionPlan(currentAction))
      : "No current action"

    const result = {
      name,
      backstory,
      playerNames: playerNamesString,
      placesNames: placesNamesString,
      reflections: reflectionsString,
      currentPlan: currentActionQueueString,
      currentAction: currentActionString,
    }
    console.log("NPC memories", result)
    return result
  }

  // Async initialization method

  async plan() {
    // Implementation for planning (if needed)
  }
}
