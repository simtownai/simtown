import styles from "./styles.module.css"
import React from "react"

interface ChatListItemProps {
  name: string
  lastMessage: string
  date: string
  isActive: boolean
  isRead: boolean
  onClick: () => void
}

const ChatListItem: React.FC<ChatListItemProps> = ({ name, lastMessage, date, isActive, isRead, onClick }) => {
  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const dayInMs = 24 * 60 * 60 * 1000
    const weekInMs = 7 * dayInMs
    if (diff < dayInMs) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    } else if (diff < weekInMs) {
      return date.toLocaleDateString("en-US", { weekday: "short" })
    } else {
      return date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })
    }
  }

  return (
    <li
      className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick()
        }
      }}
    >
      <div className={styles.contentWrapper}>
        <div className={styles.chatInfo}>
          <span className={styles.chatName}>{name}</span>
          <span className={styles.chatDate}>{formatDate(new Date(date))}</span>
        </div>
        <div className={styles.messageRow}>
          <div className={styles.lastMessage}>{lastMessage}</div>
          {!isRead && <div className={styles.unreadIndicator} />}
        </div>
      </div>
    </li>
  )
}

export default ChatListItem
