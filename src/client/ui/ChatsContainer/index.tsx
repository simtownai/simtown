import { ChatMessage } from "../../../shared/types"
import Chat from "./Chat"
import ChatsList from "./ChatsList"
import styles from "./styles.module.css"
import React, { useEffect, useMemo } from "react"
import { Socket } from "socket.io-client"

interface ChatsContainerProps {
  socket: Socket
  username: string
  chatmate: string | null
  setChatmate: (value: string | null) => void
  setIsChatsContainerCollapsed: (value: boolean) => void
  isChatCollapsed: boolean
  setIsChatCollapsed: (value: boolean) => void
  isMobile: boolean
  isExpanded: boolean
  setIsExpanded: (value: boolean) => void
  messages: Map<string, ChatMessage[]>
  setMessages: React.Dispatch<React.SetStateAction<Map<string, ChatMessage[]>>>
  composeValue: string
  setComposeValue: (value: string) => void
  isMessageLoading: boolean
  setIsMessageLoading: (value: boolean) => void
  handleClearConversation: (() => void) | null
}

const ChatsContainer: React.FC<ChatsContainerProps> = ({
  socket,
  username,
  chatmate,
  setChatmate,
  setIsChatsContainerCollapsed,
  isChatCollapsed,
  setIsChatCollapsed,
  isMobile,
  isExpanded,
  setIsExpanded,
  messages,
  setMessages,
  composeValue,
  setComposeValue,
  isMessageLoading,
  setIsMessageLoading,
  handleClearConversation,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (chatmate && !isChatCollapsed) {
          // setIsChatCollapsed(true)
          // setChatmate(null)
          setIsChatsContainerCollapsed(true)
        } else {
          setIsChatsContainerCollapsed(true)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [chatmate, isChatCollapsed])

  const containerStyle = useMemo(() => {
    if (!isMobile) {
      const width = isExpanded ? "calc(100vw - 40px)" : "750px"
      const height = isExpanded ? "calc(100vh - 40px)" : "650px"
      const maxWidth = "calc(100vw - 40px)"
      const maxHeight = "calc(100vh - 40px)"

      return {
        width,
        height,
        maxWidth,
        maxHeight,
      }
    }

    return {}
  }, [isMobile, isExpanded])

  return (
    <div
      className={`${styles.container} ${isMobile ? styles.mobileContainer : styles.desktopContainer}`}
      style={containerStyle}
    >
      <div className={styles.content}>
        {(!isMobile || isChatCollapsed) && (
          <div className={styles.chatsListWrapper}>
            <ChatsList
              isMobile={isMobile}
              messages={messages}
              username={username}
              chatmate={chatmate}
              setChatmate={setChatmate}
              setIsChatCollapsed={setIsChatCollapsed}
              setIsChatsContainerCollapsed={setIsChatsContainerCollapsed}
            />
          </div>
        )}
        {(!isMobile || !isChatCollapsed) && (
          <div
            className={`${styles.chatWrapper} ${
              isMobile
                ? styles.chatWrapperMobile
                : `${styles.chatWrapperDesktop} ${isExpanded ? styles.chatWrapperDesktopExpanded : styles.chatWrapperDesktopNormal}`
            }`}
          >
            <Chat
              socket={socket}
              username={username}
              chatmate={chatmate}
              setChatmate={setChatmate}
              setIsChatsContainerCollapsed={setIsChatsContainerCollapsed}
              setIsChatCollapsed={setIsChatCollapsed}
              isMobile={isMobile}
              isExpanded={isExpanded}
              setIsExpanded={setIsExpanded}
              messages={messages.get(chatmate || "") || []}
              setMessages={(newMessages) =>
                setMessages((prevMessages) => {
                  prevMessages.set(chatmate || "", newMessages)
                  return new Map(prevMessages)
                })
              }
              composeValue={composeValue}
              setComposeValue={setComposeValue}
              isMessageLoading={isMessageLoading}
              setIsMessageLoading={setIsMessageLoading}
              handleClearConversation={handleClearConversation}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatsContainer
