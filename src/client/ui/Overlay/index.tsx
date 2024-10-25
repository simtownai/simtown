import { getTime } from "../../../shared/functions"
import chatsIcon from "../_images/overlay/chats-icon.png"
import hintsIcon from "../_images/overlay/hints-icon.png"
import HelpContainer from "./HelpContainer"
import styles from "./styles.module.css"
import React, { useEffect, useState } from "react"

interface OverlayProps {
  isMobile: boolean
  isChatsContainerCollapsed: boolean
  setIsChatsContainerCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  totalUnreadCount: number
}

export default function Overlay({
  isMobile,
  isChatsContainerCollapsed,
  setIsChatsContainerCollapsed,
  totalUnreadCount,
}: OverlayProps) {
  const [isHelpContainerCollapsed, setIsHelpContainerCollapsed] = useState(true)
  const [currentTime, setCurrentTime] = useState(getTime())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getTime())
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    button.classList.add(styles.clicked)
    setTimeout(() => {
      button.classList.remove(styles.clicked)
    }, 100)
  }

  return (
    <>
      <div className={`${styles.overlay} ${styles.overlayTopRight}`}>
        <div className={styles.timeDisplay}>{currentTime.toISOString()}</div>
      </div>
      <div className={`${styles.overlay} ${styles.overlayBottomLeft}`}>
        <button
          className={`${styles.iconButton}`}
          onClick={(e) => {
            handleClick(e)
            setIsHelpContainerCollapsed((prev) => !prev)
          }}
        >
          <img src={hintsIcon} className={styles.buttonImage} />
        </button>
      </div>
      <div className={`${styles.overlay} ${styles.overlayBottomRight}`}>
        {isChatsContainerCollapsed && (
          <button
            className={`${styles.iconButton}`}
            onClick={(e) => {
              handleClick(e)
              setIsChatsContainerCollapsed((prev) => !prev)
            }}
          >
            <img src={chatsIcon} className={styles.buttonImage} />
            {totalUnreadCount > 0 && (
              <div className={styles.unreadBadge}>{totalUnreadCount > 99 ? "99+" : totalUnreadCount}</div>
            )}
          </button>
        )}
      </div>
      {!isHelpContainerCollapsed && (
        <HelpContainer isMobile={isMobile} setIsHelpContainerCollapsed={setIsHelpContainerCollapsed} />
      )}
    </>
  )
}
