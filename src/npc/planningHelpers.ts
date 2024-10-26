// Assuming you have access to the Action classes and their properties
import { ActionPlan, Action as ActionType } from "../shared/types"
import { Action } from "./actions/Action"
import { BroadcastAction } from "./actions/BroadcastAction"
import { IdleAction } from "./actions/IdleAction"
import { ListenAction } from "./actions/ListenAction"
import { MoveAction } from "./actions/MoveAction"
import { TalkAction } from "./actions/TalkAction"
import { NPC } from "./client"

export const transformActionToActionPlan = (action: Action): ActionType => {
  if (action instanceof IdleAction) {
    return { type: "idle" }
  } else if (action instanceof MoveAction) {
    const moveAction = action as MoveAction
    const target = moveAction.moveTarget

    if (target.targetType === "coordinates") {
      return {
        type: "move",
        target: {
          targetType: "coordinates" as const,
          x: target.x,
          y: target.y,
        },
      }
    } else if (target.targetType === "person" || target.targetType === "place") {
      return {
        type: "move",
        target: {
          targetType: target.targetType,
          name: target.name,
        },
      }
    } else {
      throw new Error("Unknown move target type")
    }
  } else if (action instanceof TalkAction) {
    const talkAction = action as TalkAction
    return {
      type: "talk",
      name: talkAction.targetPlayerUsername,
    }
  } else if (action instanceof BroadcastAction) {
    const broadcastAction = action as BroadcastAction
    return {
      type: "broadcast",
      targetPlace: broadcastAction.targetPlace,
    }
  } else if (action instanceof ListenAction) {
    const listenAction = action as ListenAction
    return {
      type: "listen",
      targetPlace: listenAction.targetPlace,
    }
  } else {
    // Fallback to idle or handle as needed
    throw new Error("Unknown action type")
  }
}

// Function to serialize Actions into ActionPlan data
export const createPlanDataFromActions = (actions: Action[]): ActionPlan => {
  return actions.map(transformActionToActionPlan)
}

/**
 * Converts plan data into Action instances
 */
export const createActionsFromPlanData = (planData: ActionPlan, npc: NPC): Action[] => {
  return planData.map((actionData: ActionType) => {
    switch (actionData.type) {
      case "idle":
        return new IdleAction(npc)
      case "move":
        return new MoveAction(npc, actionData.target)
      case "talk":
        return new TalkAction(npc, actionData.name, { type: "new" })
      case "broadcast":
        return new BroadcastAction(npc, actionData.targetPlace)
      case "listen":
        return new ListenAction(npc, actionData.targetPlace)
      default:
        throw new Error("Unknown action type:")
    }
  })
}
