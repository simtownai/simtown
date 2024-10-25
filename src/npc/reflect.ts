import { Action } from "./actions/Action"
import { MoveAction } from "./actions/MoveAction"
import { TalkAction } from "./actions/TalkAction"
import { IdleActionDuration } from "./npcConfig"
import client from "./openai"
import { summarize_conversation as summarize_conversation_prompt } from "./prompts"

export const reflect = async (action: Action) => {
  // for now we are only reflecting on completed actions
  const actionType = action.constructor.name
  if (actionType === "IdleAction") {
    return `I did nothing for ${IdleActionDuration / 1000} seconds`
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
    return `I moved to ${destination}`
  } else if (actionType === "TalkAction") {
    const talkAction = action as TalkAction
    const lastTalkedPlayerName = talkAction.targetPlayerUsername
    const latestThread = talkAction.npc.aiBrain.memory.conversations.getLatestThread(lastTalkedPlayerName)
    if (!latestThread.finished) {
      throw new Error("This thread should be finished!")
    }
    const messages = latestThread.messages
    const { firstDate, lastDate } = messages.reduce(
      (acc, item) => ({
        firstDate: new Date(item.date) < new Date(acc.firstDate) ? item.date : acc.firstDate,
        lastDate: new Date(item.date) > new Date(acc.lastDate) ? item.date : acc.lastDate,
      }),
      { firstDate: messages[0].date, lastDate: messages[0].date },
    )
    const content = messages.map((item) => {
      if (item.from == talkAction.npc.playerData.username) {
        return `I said: ${item.message}`
      } else {
        return `${item.from} said: ${item.message}`
      }
    })
    console.log("Content is", content)
    const result = await summarizeConversation(firstDate, lastDate, content.join("\n"))
    return result
  }
}

export const summarizeConversation = async (_startTime: string, _endTime: string, content: string) => {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: summarize_conversation_prompt,
      },
      { role: "user", content },
    ],
  })
  return completion.choices[0].message.content
}
