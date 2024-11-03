import { CONFIG } from "../../shared/config"
import { getGameTime } from "../../shared/functions"
import logger from "../../shared/logger"
import { GeneratedAction, GeneratedActionPlan, GeneratedActionWithPerson, MoveTarget } from "../../shared/types"
import { MovementController } from "../MovementController"
import { EmitInterface } from "../SocketManager"
import { Action } from "../actions/Action"
import { BroadcastAction } from "../actions/BroadcastAction"
import { IdleAction } from "../actions/IdleAction"
import { ListenAction } from "../actions/ListenAction"
import { MoveAction } from "../actions/MoveAction"
import { TalkAction } from "../actions/TalkAction"
import { VoteAction } from "../actions/VoteAction"
import { BrainDump } from "../brain/AIBrain"

const broadcastAnnouncementsCache: Set<string> = new Set()

function getBroadcastAnnouncementsKey(targetPlace: string, username: string): string {
  return `${targetPlace}-${username}`
}

function ifBroadcastAnnouncedAtPlace(targetPlace: string): boolean {
  return Array.from(broadcastAnnouncementsCache.values()).some((key) => key.includes(targetPlace))
}

export const convertActionToGeneratedAction = (action: Action): GeneratedActionWithPerson => {
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
    } else if (target.targetType === "place") {
      return {
        type: "move",
        target: {
          targetType: target.targetType,
          name: target.name,
        },
      }
    } else if (target.targetType === "person") {
      return {
        type: "move",
        target: {
          targetType: "person",
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
  } else if (action instanceof VoteAction) {
    return {
      type: "vote",
    }
  } else {
    throw new Error(`Unknown action type: ${action}`)
  }
}

// Function to serialize Actions into ActionPlan data
export const convertActionsToGeneratedPlan = (actions: Action[]): GeneratedActionPlan => {
  function isGeneratedAction(action: unknown): action is GeneratedAction {
    return (
      action !== null && typeof action === "object" && "type" in action
      // Add more specific checks based on your GeneratedAction type
    )
  }

  const filtered = actions.filter((action): action is MoveAction => {
    if (action instanceof MoveAction) {
      return action.moveTarget.targetType !== "person"
    }
    return true
  })

  const converted = filtered.map(convertActionToGeneratedAction)
  if (!converted.every(isGeneratedAction)) {
    throw new Error("Conversion failed: Not all actions were converted to GeneratedActions")
  }

  // TypeScript now knows converted is GeneratedAction[]
  return converted
}

/**
 * Converts plan data into Action instances
 */
export const convertGeneratedPlanToActions = (
  planData: GeneratedActionPlan,
  getBrainDump: () => BrainDump,
  getEmitMethods: () => EmitInterface,
  movementController: MovementController,
  adjustDirection: (username: string) => void,
): Action[] => {
  return planData.flatMap((actionData: GeneratedAction) => {
    let supportingMoveTarget: MoveTarget
    switch (actionData.type) {
      case "idle":
        return new IdleAction(getBrainDump, getEmitMethods, actionData.activityType)
      case "move":
        return new MoveAction(getBrainDump, getEmitMethods, movementController, actionData.target, "", false)
      case "talk":
        moveAction = new MoveAction(
          getBrainDump,
          getEmitMethods,
          movementController,
          {
            targetType: "person",
            name: actionData.name,
          },
          `Moving before talking`,
          false,
        )
        const talkAction = new TalkAction(
          getBrainDump,
          getEmitMethods,
          "",
          actionData.name,
          { type: "new" },
          movementController,
        )
        return [moveAction, talkAction]
      case "broadcast":
        if (
          ifBroadcastAnnouncedAtPlace(actionData.targetPlace) &&
          !broadcastAnnouncementsCache.has(
            getBroadcastAnnouncementsKey(actionData.targetPlace, getBrainDump().playerData.username),
          )
        ) {
          logger.warn(
            `(${getBrainDump().playerData.username}) broadcast is already announced at place ${actionData.targetPlace}`,
          )
          return []
        }
        const broadcastAction = new BroadcastAction(getBrainDump, getEmitMethods, actionData.targetPlace, "", () => {
          logger.debug(`(${getBrainDump().playerData.username}) broadcast ended`)
          broadcastAnnouncementsCache.delete(
            getBroadcastAnnouncementsKey(actionData.targetPlace, getBrainDump().playerData.username),
          )
        })
        if (
          !broadcastAnnouncementsCache.has(
            getBroadcastAnnouncementsKey(actionData.targetPlace, getBrainDump().playerData.username),
          )
        ) {
          broadcastAnnouncementsCache.add(
            getBroadcastAnnouncementsKey(actionData.targetPlace, getBrainDump().playerData.username),
          )
          getEmitMethods().emitNewsItem({
            date: getGameTime().toISOString(),
            message: `📢 ${getBrainDump().playerData.username} will be broadcasting soon`,
            place: actionData.targetPlace,
          })
        }
        supportingMoveTarget = {
          targetType: "place",
          name: actionData.targetPlace + " (podium)",
        }
        moveAction = new MoveAction(
          getBrainDump,
          getEmitMethods,
          movementController,
          {
            targetType: "place",
            name: actionData.targetPlace + " (podium)",
          },
          `Moving before broadcasting`,
          false,
        )
        const broadcastAction = new BroadcastAction(getBrainDump, getEmitMethods, actionData.targetPlace, "", () => {
          logger.debug(`(${getBrainDump().playerData.username}) broadcast ended`)
          getBrainDump().broadcastAnnouncementsCache.delete(
            getBroadcastAnnouncementsKey(actionData.targetPlace, getBrainDump().playerData.username),
          )
        })
        return [moveAction, broadcastAction]
      case "listen":
        moveAction = new MoveAction(
          getBrainDump,
          getEmitMethods,
          movementController,
          {
            targetType: "place",
            name: actionData.targetPlace,
          },
          `Moving before listening`,
          false,
        )
        const listenAction = new ListenAction(getBrainDump, getEmitMethods, actionData.targetPlace, "", (username) => {
          adjustDirection(username)
        })
        return [moveAction, listenAction]
      case "vote":
        moveAction = new MoveAction(
          getBrainDump,
          getEmitMethods,
          movementController,
          {
            targetType: "place",
            name: CONFIG.VOTING_PLACE_NAME,
          },
          `Moving before voting`,
          false,
        )
        const voteAction = new VoteAction(getBrainDump, getEmitMethods, "")
        return [moveAction, voteAction]
      default:
        throw new Error("Unknown action type:")
    }
  })
}
