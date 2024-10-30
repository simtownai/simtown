import { getTime } from "../../shared/functions"
import { GeneratedAction, GeneratedActionPlan, MoveTarget, PlayerData } from "../../shared/types"
import { MovementController } from "../MovementController"
import { EmitInterface } from "../SocketManager"
import { Action } from "../actions/Action"
import { BroadcastAction } from "../actions/BroadcastAction"
import { IdleAction } from "../actions/IdleAction"
import { ListenAction } from "../actions/ListenAction"
import { MoveAction } from "../actions/MoveAction"
import { TalkAction } from "../actions/TalkAction"
import { BrainDump } from "../brain/AIBrain"

export const convertActionToGeneratedAction = (action: Action): GeneratedAction => {
  if (action instanceof IdleAction) {
    return { type: "idle", activityType: action.activityType }
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
      name: talkAction.getTargetPlayerUsername(),
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
export const convertActionsToGeneratedPlan = (actions: Action[]): GeneratedActionPlan => {
  return actions.map(convertActionToGeneratedAction)
}

/**
 * Converts plan data into Action instances
 */
export const convertGeneratedPlanToActions = (
  planData: GeneratedActionPlan,
  getBrainDump: () => BrainDump,
  getEmitMethods: () => EmitInterface,
  movementController: MovementController,
  setAndEmitPlayerData: (playerData: PlayerData) => void,
  adjustDirection: (username: string) => void,
): Action[] => {
  return planData.flatMap((actionData: GeneratedAction) => {
    let supportingMoveTarget: MoveTarget
    switch (actionData.type) {
      case "idle":
        return new IdleAction(getBrainDump, getEmitMethods, actionData.activityType)
      case "move":
        return !movementController.ifMoveTargetReached(actionData.target)
          ? new MoveAction(getBrainDump, getEmitMethods, movementController, setAndEmitPlayerData, actionData.target)
          : []
      case "talk":
        const talkAction = new TalkAction(getBrainDump, getEmitMethods, "", actionData.name, { type: "new" })

        supportingMoveTarget = {
          targetType: "person",
          name: actionData.name,
        }
        if (!movementController.ifMoveTargetReached(supportingMoveTarget)) {
          console.log(
            "We are not close to the target player, so before we initialize the talk action, we need to move towards them.",
          )
          return [
            new MoveAction(
              getBrainDump,
              getEmitMethods,
              movementController,
              setAndEmitPlayerData,
              supportingMoveTarget,
              "We are not close to the target player, so before we initialize the talk action, we need to move towards them.",
              false,
            ),
            talkAction,
          ]
        }
        return talkAction
      case "broadcast":
        const broadcastAction = new BroadcastAction(getBrainDump, getEmitMethods, actionData.targetPlace)
        getEmitMethods().emitNewsItem({
          date: getTime().toISOString(),
          message: `${getBrainDump().playerData.username} will be broadcasting soon`,
          place: actionData.targetPlace,
        })
        supportingMoveTarget = {
          targetType: "place",
          name: actionData.targetPlace,
        }
        if (!movementController.ifMoveTargetReached(supportingMoveTarget)) {
          console.log(
            "We are not close to the target place, so before we initialize the broadcast action, we need to move towards it.",
          )
          return [
            new MoveAction(
              getBrainDump,
              getEmitMethods,
              movementController,
              setAndEmitPlayerData,
              supportingMoveTarget,
              "We are not close to the target place, so before we initialize the broadcast action, we need to move towards it.",
              false,
            ),
            broadcastAction,
          ]
        }

        return broadcastAction
      case "listen":
        const listenAction = new ListenAction(getBrainDump, getEmitMethods, actionData.targetPlace, "", (username) => {
          adjustDirection(username)
        })
        supportingMoveTarget = {
          targetType: "place",
          name: actionData.targetPlace,
        }
        if (!movementController.ifMoveTargetReached(supportingMoveTarget)) {
          console.log(
            "We are not close to the target place, so before we initialize the listen action, we need to move towards it.",
          )
          return [
            new MoveAction(
              getBrainDump,
              getEmitMethods,
              movementController,
              setAndEmitPlayerData,
              supportingMoveTarget,
              "We are not close to the target place, so before we initialize the listen action, we need to move towards it.",
              false,
            ),
            listenAction,
          ]
        }
        return listenAction
      default:
        throw new Error("Unknown action type:")
    }
  })
}
