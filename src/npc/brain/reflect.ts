import { Action } from "../actions/Action"
import { BroadcastAction } from "../actions/BroadcastAction"
import { IdleAction } from "../actions/IdleAction"
import { ListenAction } from "../actions/ListenAction"
import { MoveAction } from "../actions/MoveAction"
import { TalkAction } from "../actions/TalkAction"
import { IdleActionDuration } from "../npcConfig"
import client from "../openai/openai"
import { summarize_broadcast_prompt, summarize_conversation_prompt, summarize_speech_prompt } from "../prompts"
import { StringifiedBrainDump } from "./AIBrain"

export const reflect = async (action: Action) => {
  const isInterrupted = action.isInterrupted
  console.log("Is interrupted", isInterrupted)
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
    return isInterrupted
      ? `I was moving to ${destination} but got interrupted.`
      : `I completed Move Action, moved to ${destination}`
  } else if (actionType === "TalkAction") {
    const talkAction = action as TalkAction
    const lastTalkedPlayerName = talkAction.targetPlayerUsername
    const latestThread = talkAction.getBrainDump().getLatestThread(lastTalkedPlayerName)
    if (!latestThread.finished) {
      throw new Error("This thread should be finished!")
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
      : `I completed Talk Action, talked to ${lastTalkedPlayerName}, summary of the conversation: ${result}`
  } else if (actionType === "BroadcastAction") {
    const broadcastAction = action as BroadcastAction
    const summary = await summarizeBroadcast(reflections, broadcastAction.broadcastContent)
    return isInterrupted
      ? `I was broadcasting but got interrupted. I managed to broadcast: ${summary}`
      : `I completed Broadcast Action, broadcasted: ${summary}`
  } else if (actionType === "ListenAction") {
    const listenAction = action as ListenAction
    const summary = await summarizeSpeech(reflections, listenAction.accumulatedBroadcast)
    return isInterrupted
      ? `I was listening to a broadcast but got interrupted. I managed to listen: ${summary}`
      : `I completed Listen Action, listened to a broadcast: ${summary}`
  }
  throw new Error(`Could not reflect for action: ${actionType}`)
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
