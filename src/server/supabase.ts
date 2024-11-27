import logger from "../shared/logger"
import type { Database } from "../shared/supabase-types"
import { ChatMessage } from "../shared/types"
import { createClient } from "@supabase/supabase-js"

const client = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const fakeUserId = "1253d7f9-2147-4fd8-a7ae-65c8ebd771fd"

const threadsMap: Map<string, string> = new Map()

export const createNewChat = async (character_name: string) => {
  const { data } = await client.from("chats").insert({ user_id: fakeUserId, character_name }).select()
  if (!data) {
    throw new Error("Failed to create new chat")
  }
  return data[0].id
}

export const insertMessage = async (message: ChatMessage, chat_id: string, currentUser: string) => {
  const formattedMessage = {
    content: message.message,
    role: message.from === currentUser ? "user" : "assistant",
    chat_id,
    created_at: new Date().toISOString(),
  }

  const { data, error } = await client.from("messages").insert(formattedMessage)
  if (error) {
    logger.error("Error inserting messages", error)
    console.error(error)
  }
}

const prefix = "supabase-chat-"

export const clearLocalStorage = () => {
  threadsMap.clear()
}

export const saveMessageToSupabase = async (message: ChatMessage, currentUser: string) => {
  try {
    const characteName = message.from === currentUser ? message.to : message.from

    const existingChatId = threadsMap.get(`${prefix}${characteName}`)

    if (!existingChatId) {
      const newChatId = await createNewChat(characteName)
      threadsMap.set(`${prefix}${characteName}`, newChatId)
      await insertMessage(message, newChatId, currentUser)
    } else {
      await insertMessage(message, existingChatId, currentUser)
    }
  } catch (error) {
    logger.error("Error saving message to supabase")
    console.error(error)
  }
}

export default client
