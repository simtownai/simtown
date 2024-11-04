import logger from "../../shared/logger"
import { Action } from "../actions/Action"
import { BroadcastAction } from "../actions/BroadcastAction"
import { IdleAction } from "../actions/IdleAction"
import { ListenAction } from "../actions/ListenAction"
import { MoveAction } from "../actions/MoveAction"
import { TalkAction } from "../actions/TalkAction"
import { VoteAction } from "../actions/VoteAction"
import { IdleActionDuration } from "../npcConfig"
import client from "../openai/openai"
import {
  summarize_broadcast_prompt,
  summarize_conversation_prompt,
  summarize_reflections_prompt,
  summarize_speech_prompt,
} from "../prompts"
import { StringifiedBrainDump } from "./AIBrain"

export const reflect = async (action: Action) => {
  const isInterrupted = action.isInterrupted
  // for now we are only reflecting on completed actions
  const actionType = action.constructor.name
  const reflections = action.getBrainDump().getStringifiedBrainDump()
  if (actionType === "IdleAction") {
    const idleAction = action as IdleAction
    return isInterrupted
      ? `I was ${idleAction.activityType}, but got interrupted.`
      : `I completed ${idleAction.activityType} for ${IdleActionDuration / 1000} seconds`
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
    const result = await summarizeConversation(reflections, content.join("\n"))
    return isInterrupted
      ? `I was talking to ${lastTalkedPlayerName} but got interrupted. Summary of the conversation: ${result}`
      : `I talked with ${lastTalkedPlayerName}, summary of the conversation: ${result}`
  } else if (actionType === "BroadcastAction") {
    const broadcastAction = action as BroadcastAction
    const summary = await summarizeBroadcast(reflections, broadcastAction.broadcastContent)
    return isInterrupted
      ? `I was giving a speech but got interrupted. I managed to broadcast: ${summary}`
      : `I gave a speech, talked about: ${summary}`
  } else if (actionType === "ListenAction") {
    const listenAction = action as ListenAction
    const summary = await summarizeSpeech(reflections, listenAction.accumulatedBroadcast)
    return isInterrupted
      ? `I was listening to a a speech. Summary of what I heard: ${summary}`
      : `I listen to the speech, quick summary:: ${summary}`
  } else if (actionType === "VoteAction") {
    const voteAction = action as VoteAction
    return `I voted for ${voteAction.chosenCandidate} in the last voting round.`
  }
  throw new Error(`Could not reflect for action: ${actionType}`)
}

export const summarizeReflections = async (braindump: StringifiedBrainDump) => {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: summarize_reflections_prompt(braindump) }],
  })
  return completion.choices[0].message.content
}

const summarizeConversation = async (reflections: StringifiedBrainDump, content: string) => {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: summarize_conversation_prompt(reflections),
      },
      { role: "user", content },
    ],
  })
  return completion.choices[0].message.content
}

const summarizeBroadcast = async (reflections: StringifiedBrainDump, broadcastContent: string) => {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: summarize_broadcast_prompt(reflections, broadcastContent) }],
  })
  return completion.choices[0].message.content
}

const summarizeSpeech = async (reflections: StringifiedBrainDump, speechContent: string) => {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: summarize_speech_prompt(reflections, speechContent) }],
  })
  return completion.choices[0].message.content
}
