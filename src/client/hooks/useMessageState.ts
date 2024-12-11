import { BroadcastMessage, ChatMessage } from "../../shared/types"
import { useEffect, useRef } from "react"
import { Socket } from "socket.io-client"

interface UseMessageStateProps {
  socket: Socket
  username: string
  isChatsContainerCollapsed: boolean
  isChatCollapsed: boolean
  chatmate: string | null
  isNewsContainerCollapsed: boolean
  addMessage: (message: ChatMessage, key: string) => void
}

export function useMessageState({
  socket,
  username,
  isChatsContainerCollapsed,
  isChatCollapsed,
  chatmate,
  addMessage,
}: UseMessageStateProps) {
  const chatmateRef = useRef(chatmate)
  const isChatsContainerCollapsedRef = useRef(isChatsContainerCollapsed)
  const isChatCollapsedRef = useRef(isChatCollapsed)

  useEffect(() => {
    chatmateRef.current = chatmate
  }, [chatmate])

  useEffect(() => {
    isChatsContainerCollapsedRef.current = isChatsContainerCollapsed
  }, [isChatsContainerCollapsed])

  useEffect(() => {
    isChatCollapsedRef.current = isChatCollapsed
  }, [isChatCollapsed])

  useEffect(() => {
    socket.on("newMessage", (message: ChatMessage) => {
      const newMessage = {
        ...message,
        isRead:
          !isChatsContainerCollapsedRef.current && !isChatCollapsedRef.current && chatmateRef.current === message.from,
      } as ChatMessage
      addMessage(newMessage, message.from)
    })

    socket.on("overhearMessage", (message: ChatMessage) => {
      const [first, second] = [message.from, message.to].sort()
      const key = `${first}-${second} (overheard)`
      const newMessage = {
        ...message,
        isRead: true,
      } as ChatMessage
      addMessage(newMessage, key)
    })

    socket.on("listenBroadcast", (message: BroadcastMessage) => {
      const key = `${message.from} (broadcast)`
      const newMessage = {
        to: username,
        ...message,
        isRead: !isChatsContainerCollapsedRef.current && !isChatCollapsedRef.current && chatmateRef.current === key,
      } as ChatMessage
      addMessage(newMessage, key)
    })

    socket.on("endConversation", (message: ChatMessage) => {
      const newMessage = {
        ...message,
        isRead:
          !isChatsContainerCollapsedRef.current && !isChatCollapsedRef.current && chatmateRef.current === message.from,
      } as ChatMessage
      addMessage(newMessage, message.from)
    })

    return () => {
      socket.off("newMessage")
      socket.off("overhearMessage")
      socket.off("listenBroadcast")
      socket.off("endConversation")
    }
  }, [socket, username, addMessage])

  return {}
}
