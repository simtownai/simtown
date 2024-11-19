import styles from "./styles.module.css"
import React from "react"

interface NPCListItemProps {
  name: string
  lastAction: string
  isActive: boolean
  onClick: () => void
}

const NPCListItem: React.FC<NPCListItemProps> = ({ name, lastAction, isActive, onClick }) => {
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
        </div>
        <div className={styles.messageRow}>
          <div className={styles.lastMessage}>{lastAction}</div>
        </div>
      </div>
    </li>
  )
}

export default NPCListItem
