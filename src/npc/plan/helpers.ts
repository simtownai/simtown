import { getBroadcastAnnouncementsKey } from "../../shared/functions"
import logger from "../../shared/logger"
import { AIAction, AIActionPlan, MapConfig, NewsItem } from "../../shared/types"
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
import { PromptSystem } from "../prompts"

export const convertActionToGeneratedAction = (action: Action): AIAction => {
  if (action instanceof MoveAction) {
    if (action.moveTarget.targetType === "person") return { type: "movetoperson", target: action.moveTarget }
    else if (action.moveTarget.targetType === "place") return { type: "movetoplace", target: action.moveTarget }
    else return { type: "movetocoordinates", target: action.moveTarget }
  } else if (action instanceof IdleAction) {
    return { type: "idle", activityType: action.activityType }
  } else if (action instanceof TalkAction) {
    return { type: "talk", name: action.getTargetPlayerUsername() }
  } else if (action instanceof BroadcastAction) {
    return { type: "broadcast", targetPlace: action.targetPlace }
  } else if (action instanceof ListenAction) {
    return { type: "listen", targetPlace: action.targetPlace }
  } else if (action instanceof VoteAction) {
    return { type: "vote" }
  } else {
    throw new Error(`Unknown action type: ${action.constructor.name}`)
  }
}

// Function to serialize Actions into ActionPlan data
export const convertActionsToGeneratedPlan = (actions: Action[]): AIActionPlan => {
  function isGeneratedAction(action: unknown): action is AIAction {
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

export const convertGeneratedPlanToActions = (
  planData: AIActionPlan,
  getBrainDump: () => BrainDump,
  getEmitMethods: () => EmitInterface,
  movementController: MovementController,
  adjustDirection: (username: string) => void,
  promptSystem: PromptSystem,
  mapConfig: MapConfig,
): Action[] => {
  // Define a type for all possible action combinations
  type ActionResult = Action | Action[]

  // Helper function to handle broadcast announcement
  const handleBroadcastAnnouncement = (targetPlace: string, username: string) => {
    const key = getBroadcastAnnouncementsKey(targetPlace, username)
    if (!getBrainDump().broadcastAnnouncementsCache.has(key)) {
      getEmitMethods().emitNewsItem({
        // date: getGameTime().toISOString(),
        date: new Date().toISOString(),
        message: `📢 ${username} will be broadcasting soon`,
        place: targetPlace,
      } as NewsItem)
    }
  }

  const actions: ActionResult[] = planData.map((actionData: AIAction): ActionResult => {
    let moveAction: MoveAction

    switch (actionData.type) {
      case "idle":
        return new IdleAction(getBrainDump, getEmitMethods, actionData.activityType)

      case "movetocoordinates":
      case "movetoperson":
      case "movetoplace":
        return new MoveAction(getBrainDump, getEmitMethods, movementController, actionData.target, "", false)

      case "talk":
        moveAction = new MoveAction(
          getBrainDump,
          getEmitMethods,
          movementController,
          { targetType: "person", name: actionData.name },
          `Moving before talking`,
          false,
        )
        return [
          moveAction,
          new TalkAction(
            getBrainDump,
            getEmitMethods,
            "",
            actionData.name,
            { type: "new" },
            movementController,
            promptSystem,
          ),
        ]

      case "broadcast":
        handleBroadcastAnnouncement(actionData.targetPlace, getBrainDump().playerData.username)
        moveAction = new MoveAction(
          getBrainDump,
          getEmitMethods,
          movementController,
          { targetType: "place", name: actionData.targetPlace + " (podium)" },
          `Moving before broadcasting`,
          false,
        )
        return [
          moveAction,
          new BroadcastAction(
            getBrainDump,
            getEmitMethods,
            actionData.targetPlace,
            "",
            () => {
              logger.debug(`(${getBrainDump().playerData.username}) broadcast ended`)
              getEmitMethods().emitNewsItem({
                // date: getGameTime().toISOString(),
                date: new Date().toISOString(),
                message: `📢 ${getBrainDump().playerData.username} has finished broadcasting`,
                place: actionData.targetPlace,
              } as NewsItem)
            },
            promptSystem,
          ),
        ]

      case "listen":
        moveAction = new MoveAction(
          getBrainDump,
          getEmitMethods,
          movementController,
          { targetType: "place", name: actionData.targetPlace },
          `Moving before listening`,
          false,
        )
        return [moveAction, new ListenAction(getBrainDump, getEmitMethods, actionData.targetPlace, "", adjustDirection)]

      case "vote":
        moveAction = new MoveAction(
          getBrainDump,
          getEmitMethods,
          movementController,
          { targetType: "place", name: mapConfig.votingPlaceName },
          `Moving before voting`,
          false,
        )
        return [moveAction, new VoteAction(getBrainDump, getEmitMethods, "", promptSystem)]

      default:
        throw new Error(`Unknown action type: ${(actionData as any).type}`)
    }
  })

  return actions.flat()
}
