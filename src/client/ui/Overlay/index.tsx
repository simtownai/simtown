import { CONFIG } from "../../../shared/config"
import { getTime } from "../../../shared/functions"
import chatsIcon from "../_images/overlay/chats-icon.png"
import hintsIcon from "../_images/overlay/hints-icon.png"
import newsIcon from "../_images/overlay/news-icon.png"
import HelpContainer from "./HelpContainer"
import styles from "./styles.module.css"
import React, { useEffect, useState } from "react"

interface OverlayProps {
  isMobile: boolean
  isChatsContainerCollapsed: boolean
  setIsChatsContainerCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  totalUnreadCount: number
  setIsNewsContainerCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  totalNewsUnreadCount: number
}

export default function Overlay({
  isMobile,
  isChatsContainerCollapsed,
  setIsChatsContainerCollapsed,
  totalUnreadCount,
  setIsNewsContainerCollapsed,
  totalNewsUnreadCount,
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

  const formatTimeAMPM = (date: Date) => {
    let hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? "PM" : "AM"
    hours = hours % 12
    hours = hours ? hours : 12 // Convert 0 to 12
    const minutesStr = minutes < 10 ? "0" + minutes : minutes
    return `${hours}:${minutesStr} ${ampm}`
  }

  const getDaysRemaining = () => {
    const now = currentTime
    const targetDate = CONFIG.TARGET_DATE
    const diffTime = targetDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

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
        <div className={styles.timeDisplay}>
          <div>{formatTimeAMPM(currentTime)}</div>
          <div>{getDaysRemaining()} days left</div>
        </div>
      </div>
      <div className={`${styles.overlay} ${styles.overlayTopLeft}`}>
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
      <div className={`${styles.overlay} ${styles.overlayBottomLeft}`}>
        <button
          className={`${styles.iconButton}`}
          onClick={(e) => {
            handleClick(e)
            setIsNewsContainerCollapsed((prev) => !prev)
          }}
        >
          <img src={newsIcon} className={styles.buttonImage} />
          {totalNewsUnreadCount > 0 && (
            <div className={styles.unreadBadge}>{totalNewsUnreadCount > 99 ? "99+" : totalNewsUnreadCount}</div>
          )}
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
