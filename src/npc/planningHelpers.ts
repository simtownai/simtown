// Assuming you have access to the Action classes and their properties
import { ActionPlan } from "./Plan"
import { Action } from "./actions/Action"
import { IdleAction } from "./actions/IdleAction"
import { MoveAction } from "./actions/MoveAction"
import { TalkAction } from "./actions/TalkAction"

// Adjust the import path accordingly

// Function to serialize Actions into ActionPlan data
export const createPlanDataFromActions = (actions: Action[]): ActionPlan => {
  return actions.map((action) => {
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
    } else {
      // Fallback to idle or handle as needed
      throw new Error("Unknown action type")
    }
  })
}
