import { ChatMessage } from "../../shared/types"
import { supabase } from "../supabase"
import { Session } from "@supabase/supabase-js"
import { useEffect, useState } from "react"
import { Socket } from "socket.io-client"

interface UseSupabaseSessionReturn {
  supabaseSession: Session | null
  username: string
  initialMessages: Map<string, ChatMessage[]> | null
}

export const useSupabaseSession = (defaultUsername: string, socket: Socket): UseSupabaseSessionReturn => {
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null)
  const [username, setUsername] = useState<string>(defaultUsername)
  const [initialMessages, setInitialMessages] = useState<Map<string, ChatMessage[]> | null>(null)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("onAuthStateChange", event, session)
      setSupabaseSession(session)
      if (session) {
        setUsername(session.user.email ? session.user.email.split("@")[0] : session.user.id)
        const initialMessages = await initializeMessages(session.user.id)
        setInitialMessages(initialMessages)
        console.log("initialMessages", initialMessages)
        socket?.emit("authorizeSupabase", session.access_token)
      } else {
        setInitialMessages(new Map())
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [socket])

  return {
    supabaseSession,
    username,
    initialMessages,
  }
}

export async function initializeMessages(userId: string) {
  const { data: threads, error: threadError } = await supabase
    .from("thread_participant")
    .select(
      `
      thread_id,
      thread (
        message (
          id,
          content,
          created_at,
          from_user_id,
          from_npc_instance_id
        ),
        thread_participant (
          user_id,
          npc_instance_id
        )
      )
    `,
    )
    .eq("user_id", userId)

  if (threadError) {
    console.error("Error fetching threads:", threadError)
    return new Map<string, ChatMessage[]>()
  }

  const messagesMap = new Map<string, ChatMessage[]>()

  threads?.forEach((thread) => {
    if (!thread.thread) return

    // Find the other participant (not the current user)
    const otherParticipant = thread.thread.thread_participant.find((p) => p.user_id !== userId)

    if (!otherParticipant) return

    // Use either npc_instance_id or user_id as the key
    const key = otherParticipant.npc_instance_id?.toString() || otherParticipant.user_id || ""

    // Convert messages to ChatMessage format
    const chatMessages: ChatMessage[] = thread.thread.message
      .map((msg) => ({
        from: msg.from_npc_instance_id ? msg.from_npc_instance_id.toString() : msg.from_user_id || "",
        to: msg.from_npc_instance_id
          ? userId
          : otherParticipant.npc_instance_id?.toString() || otherParticipant.user_id || "",
        message: msg.content,
        date: msg.created_at!,
        isRead: true, // You might want to add a read status column in your schema
      }))
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())

    messagesMap.set(key, chatMessages)
  })

  return messagesMap
}
