import { ChatMessage } from "../../shared/types"
import { useEffect, useState } from "react"

export function useLocalStorageMessages(username: string | null) {
  const [messages, setMessages] = useState<Map<string, ChatMessage[]>>(new Map())

  useEffect(() => {
    if (username) {
      const messagesHistory = localStorage.getItem(`chat-history-${username}`)
      if (messagesHistory) {
        setMessages(new Map(JSON.parse(messagesHistory)))
      }
    }
  }, [username])

  useEffect(() => {
    if (username) {
      localStorage.setItem(`chat-history-${username}`, JSON.stringify(Array.from(messages.entries())))
    }
  }, [messages, username])

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
