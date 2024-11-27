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
  console.log("Formatted message", formattedMessage)

  const { data, error } = await client.from("messages").insert(formattedMessage)
  if (error) {
    console.error("Error inserting messages", error)
  }
  console.log("Messages inserted", data)
}

const prefix = "supabase-chat-"

export const clearLocalStorage = () => {
  console.log("Cleaning local storage from supabase chat")
  threadsMap.clear()
}

export const saveMessageToSupabase = async (message: ChatMessage, currentUser: string) => {
  try {
    const characteName = message.from === currentUser ? message.to : message.from

    const existingChatId = threadsMap.get(`${prefix}${characteName}`)

    console.log("Chat cookie is", characteName)

    if (!existingChatId) {
      console.log("We don't have a chat id for this user, creating new chat")
      const newChatId = await createNewChat(characteName)
      console.log("New chat id is", newChatId)
      threadsMap.set(`${prefix}${characteName}`, newChatId)
      await insertMessage(message, newChatId, currentUser)
    } else {
      console.log("We have a chat id for this user, inserting message", message)
      await insertMessage(message, existingChatId, currentUser)
    }
  } catch (error) {
    console.error("Error saving message to supabase", error)
  }
}

export default client
