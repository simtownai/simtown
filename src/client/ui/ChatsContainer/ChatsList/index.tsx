import { MessageType } from "../../_interfaces"
import Header from "../Chat/Header"
import ChatListItem from "./ChatListItem"
import styles from "./styles.module.css"
import React from "react"

interface ChatsListProps {
  isMobile: boolean
  messages: Map<string, MessageType[]>
  chatmate: string | null
  setChatmate: (value: string) => void
  setIsChatCollapsed: (value: boolean) => void
  setIsChatsContainerCollapsed: (value: boolean) => void
}

const ChatsList: React.FC<ChatsListProps> = ({
  isMobile,
  messages,
  chatmate,
  setChatmate,
  setIsChatCollapsed,
  setIsChatsContainerCollapsed,
}) => {
  const chatmatesWithLastMessage = React.useMemo(() => {
    return Array.from(messages.entries())
      .map(([name, msgs]) => {
        const lastMessage = msgs[msgs.length - 1]
        return {
          name,
          lastMessage: lastMessage ? lastMessage.content : "No messages yet",
          date: lastMessage ? lastMessage.date : new Date().toISOString(),
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [messages])

  return (
    <div className={`${styles.chatList} ${isMobile ? styles.chatListMobile : styles.chatListDesktop}`}>
      <Header
        isMobile={isMobile}
        text="Chats"
        onCollapseButtonClick={isMobile ? () => setIsChatsContainerCollapsed(true) : null}
        onBackButtonClick={null}
        onClearButtonClick={null}
      />
      <ul className={styles.list}>
        {chatmatesWithLastMessage.map(({ name, lastMessage, date }) => (
          <ChatListItem
            key={name}
            name={name}
            lastMessage={lastMessage}
            date={date}
            isActive={chatmate === name}
            onClick={() => {
              setChatmate(name)
              setIsChatCollapsed(false)
            }}
          />
        ))}
      </ul>
    </div>
  )
}

export default ChatsList
