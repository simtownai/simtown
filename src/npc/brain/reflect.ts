import { CONFIG } from "../../shared/config"
import logger from "../../shared/logger"
import { Action } from "../actions/Action"
import { BroadcastAction } from "../actions/BroadcastAction"
import { IdleAction } from "../actions/IdleAction"
import { ListenAction } from "../actions/ListenAction"
import { MoveAction } from "../actions/MoveAction"
import { TalkAction } from "../actions/TalkAction"
import { VoteAction } from "../actions/VoteAction"
import client from "../openai/openai"
import { PromptSystem } from "../prompts"
import { StringifiedBrainDump } from "./AIBrain"

export const reflect = async (action: Action, promptSystem: PromptSystem) => {
  const isInterrupted = action.isInterrupted
  // for now we are only reflecting on completed actions
  const actionType = action.constructor.name
  const reflections = action.getBrainDump().getStringifiedBrainDump()
  if (actionType === "IdleAction") {
    const idleAction = action as IdleAction
    return isInterrupted
      ? `I was ${idleAction.activityType}, but got interrupted.`
      : `I completed ${idleAction.activityType} for ${idleAction.IdleActionDuration / 1000} seconds`
  } else if (actionType === "MoveAction") {
    const moveAction = action as MoveAction
    //   as we are assuming this is completed, we know we succesfuly got to target
    const target = moveAction.moveTarget.targetType
    let destination = ""
    if (target === "person" || target === "place") {
      destination = moveAction.moveTarget.name
    } else if (target === "coordinates") {
      destination = `Coordinates ${moveAction.moveTarget.x}, ${moveAction.moveTarget.y}`
    }
    return isInterrupted ? `I was moving to ${destination} but got interrupted.` : `I moved to ${destination}`
  } else if (actionType === "TalkAction") {
    const talkAction = action as TalkAction
    const lastTalkedPlayerName = talkAction.getTargetPlayerUsername()

    const latestThread = talkAction.getBrainDump().getLatestThread(lastTalkedPlayerName)

    if (!latestThread.finished) {
      logger.error("This thread should be finished!")
      // log_threads(talkAction.getBrainDump())
      // throw new Error("This thread should be finished!")
    }
    const messages = latestThread.messages

    const content = messages.map((item) => {
      if (item.from == talkAction.getBrainDump().playerData.username) {
        return `I said: ${item.message}`
      } else {
        return `${item.from} said: ${item.message}`
      }
    })
    const result = await summarizeConversation(reflections, content.join("\n"), promptSystem)
    return isInterrupted
      ? `I was talking to ${lastTalkedPlayerName} but got interrupted. Summary of the conversation: ${result}`
      : `I talked with ${lastTalkedPlayerName}, summary of the conversation: ${result}`
  } else if (actionType === "BroadcastAction") {
    const broadcastAction = action as BroadcastAction
    const summary = await summarizeBroadcast(reflections, broadcastAction.broadcastContent, promptSystem)
    return isInterrupted
      ? `I was giving a speech but got interrupted. I managed to broadcast: ${summary}`
      : `I gave a speech, talked about: ${summary}`
  } else if (actionType === "ListenAction") {
    const listenAction = action as ListenAction
    const summary = await summarizeSpeech(reflections, listenAction.accumulatedBroadcast, promptSystem)
    return isInterrupted
      ? `I was listening to a a speech. Summary of what I heard: ${summary}`
      : `I listen to the speech, quick summary:: ${summary}`
  } else if (actionType === "VoteAction") {
    const voteAction = action as VoteAction
    return `I voted for ${voteAction.chosenCandidate} in the last voting round.`
  }
  throw new Error(`Could not reflect for action: ${actionType}`)
}

export const summarizeReflections = async (braindump: StringifiedBrainDump, promptSystem: PromptSystem) => {
  const completion = await client.chat.completions.create({
    model: CONFIG.MODEL_NAME,
    messages: [{ role: "system", content: promptSystem.summarizeReflections(braindump) }],
  })
  return completion.choices[0].message.content
}

const summarizeConversation = async (
  reflections: StringifiedBrainDump,
  content: string,
  promptSystem: PromptSystem,
) => {
  const completion = await client.chat.completions.create({
    model: CONFIG.MODEL_NAME,
    messages: [
      {
        role: "system",
        content: promptSystem.summarizeConversation(reflections),
      },
      { role: "user", content },
    ],
  })
  return completion.choices[0].message.content
}

const summarizeBroadcast = async (
  reflections: StringifiedBrainDump,
  broadcastContent: string,
  promptSystem: PromptSystem,
) => {
  const completion = await client.chat.completions.create({
    model: CONFIG.MODEL_NAME,
    messages: [{ role: "system", content: promptSystem.summarizeBroadcast(reflections, broadcastContent) }],
  })
  return completion.choices[0].message.content
}

const summarizeSpeech = async (
  reflections: StringifiedBrainDump,
  speechContent: string,
  promptSystem: PromptSystem,
) => {
  const completion = await client.chat.completions.create({
    model: CONFIG.MODEL_NAME,
    messages: [{ role: "system", content: promptSystem.summarizeSpeech(reflections, speechContent) }],
  })
  return completion.choices[0].message.content
}
