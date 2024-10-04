import { MessageType } from "../../_interfaces"
import Header from "../Chat/Header"
import styles from "./styles.module.css"

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
        {Array.from(messages.keys()).map((name) => (
          <li
            key={name}
            className={`${styles.item} ${chatmate === name ? styles.itemActive : ""}`}
            onClick={() => {
              setChatmate(name)
              setIsChatCollapsed(false)
            }}
          >
            {name}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ChatsList
