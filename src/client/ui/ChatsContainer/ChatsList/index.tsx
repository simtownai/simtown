import { ChatMessage } from "../../../../shared/types"
import Header from "../../OverlayHeader"
import ChatListItem from "./ChatListItem"
import styles from "./styles.module.css"
import React, { useEffect, useMemo } from "react"

interface ChatsListProps {
  isMobile: boolean
  messages: Map<string, ChatMessage[]>
  username: string
  chatmate: string | null
  setChatmate: (value: string) => void
  setIsChatCollapsed: (value: boolean) => void
  setIsChatsContainerCollapsed: (value: boolean) => void
}

const ChatsList: React.FC<ChatsListProps> = ({
  isMobile,
  messages,
  username,
  chatmate,
  setChatmate,
  setIsChatCollapsed,
  setIsChatsContainerCollapsed,
}) => {
  const chatmatesWithLastMessage = useMemo(() => {
    return Array.from(messages.entries())
      .map(([name, msgs]) => {
        const lastChatmateMessage = [...msgs].reverse().find((msg) => msg.from !== username)
        const lastMessage = msgs[msgs.length - 1]
        return {
          name,
          lastMessage: lastMessage ? lastMessage.message : "No messages yet",
          date: lastMessage ? lastMessage.date : new Date().toISOString(),
          isRead: lastChatmateMessage ? lastChatmateMessage.isRead! : true, // TODO: handle undefined
        }
      })
      .sort((a, b) => {
        const aIsSpecial = a.name.endsWith("(overheard)") || a.name.endsWith("(broadcast)")
        const bIsSpecial = b.name.endsWith("(overheard)") || b.name.endsWith("(broadcast)")

        if (aIsSpecial && !bIsSpecial) return 1
        if (!aIsSpecial && bIsSpecial) return -1

        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
  }, [messages])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key >= "1" && event.key <= "9") {
        const index = parseInt(event.key) - 1
        if (index < chatmatesWithLastMessage.length) {
          const selectedChatmate = chatmatesWithLastMessage[index].name
          setChatmate(selectedChatmate)
          setIsChatCollapsed(false)
          event.preventDefault()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [chatmatesWithLastMessage, setChatmate, setIsChatCollapsed])

  return (
    <div className={`${styles.chatList} ${isMobile ? styles.chatListMobile : styles.chatListDesktop}`}>
      <Header
        isMobile={isMobile}
        text="Chats"
        onCollapseButtonClick={isMobile ? () => setIsChatsContainerCollapsed(true) : null}
        onBackButtonClick={null}
        onClearButtonClick={null}
      />
      {chatmatesWithLastMessage.length !== 0 ? (
        <ul className={styles.list}>
          {chatmatesWithLastMessage.map(({ name, lastMessage, date, isRead }, index) => (
            <ChatListItem
              key={name}
              name={name}
              lastMessage={lastMessage}
              date={date}
              isActive={chatmate === name}
              isRead={isRead}
              onClick={() => {
                setChatmate(name)
                setIsChatCollapsed(false)
              }}
            />
          ))}
        </ul>
      ) : (
        <div className={styles.placeholder}>You don't have any messages yet</div>
      )}
    </div>
  )
}

export default ChatsList
