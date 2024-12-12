import { ChatMessage } from "../../shared/types"
import { supabase } from "../supabase"
import { useEffect, useState } from "react"

interface UseInitialMessagesReturn {
  initialMessages: Map<string, ChatMessage[]>
  isLoading: boolean
}

export const useInitialMessages = (): UseInitialMessagesReturn => {
  const [initialMessages, setInitialMessages] = useState<Map<string, ChatMessage[]>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadMessages = async () => {
      try {
        console.log("before getting user id initial")
        const user_id = (await supabase.auth.getSession()).data.session?.user.id
        console.log("retrieved getting user id initial", user_id)

        if (user_id) {
          console.log("before messages initial", initialMessages)
          const serverMessages = await initializeMessages(user_id)
          console.log("after messages", serverMessages)
          setInitialMessages(serverMessages)
        }
      } catch (err) {
      } finally {
        setIsLoading(false)
      }
    }

    loadMessages()
  }, [])

  return { initialMessages, isLoading }
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
