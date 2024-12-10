import { ChatMessage } from "../../shared/types"
import { useState } from "react"

export function useLocalStorageMessages() {
  const [messages, setMessages] = useState<Map<string, ChatMessage[]>>(new Map())

  const markMessagesAsRead = (chatmate: string) => {
    setMessages((prevMessages) => {
      const userMessages = prevMessages.get(chatmate)
      if (!userMessages) return prevMessages

      const updatedMessages = userMessages.map((msg) => ({
        ...msg,
        isRead: true,
      }))
      return new Map(prevMessages).set(chatmate, updatedMessages)
    })
  }

  const addMessage = (message: ChatMessage, key: string) => {
    setMessages((prevMessages) => {
      const oldMessages = prevMessages.get(key) || []
      const newMessages = [...oldMessages, message]
      return new Map(prevMessages).set(key, newMessages)
    })
  }

  return {
    messages,
    setMessages,
    markMessagesAsRead,
    addMessage,
  }
}
