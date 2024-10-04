import styles from "./styles.module.css"
import React from "react"

interface ChatListItemProps {
  name: string
  lastMessage: string
  date: string
  isActive: boolean
  onClick: () => void
}

const ChatListItem: React.FC<ChatListItemProps> = ({ name, lastMessage, date, isActive, onClick }) => {
  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const dayInMs = 24 * 60 * 60 * 1000
    const weekInMs = 7 * dayInMs

    if (diff < dayInMs) {
      // Within last 24 hours, show time
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    } else if (diff < weekInMs) {
      // Within last week, show day name
      return date.toLocaleDateString("en-US", { weekday: "short" })
    } else {
      // Otherwise, show date
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
      <div className={styles.chatInfo}>
        <span className={styles.chatName}>{name}</span>
        <span className={styles.chatDate}>{formatDate(new Date(date))}</span>
      </div>
      <div className={styles.lastMessage}>{lastMessage}</div>
    </li>
  )
}

export default ChatListItem
