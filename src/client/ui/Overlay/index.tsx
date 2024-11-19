import { CONFIG } from "../../../shared/config"
import { formatTimeAMPM, getDaysRemaining, getGameTime } from "../../../shared/functions"
import chatsIcon from "../_images/overlay/chats-icon.png"
import hintsIcon from "../_images/overlay/hints-icon.png"
import homeIcon from "../_images/overlay/home-icon.png"
import newsIcon from "../_images/overlay/news-icon.png"
import soundOffIcon from "../_images/overlay/sound-off-icon.png"
import soundOnIcon from "../_images/overlay/sound-on-icon.png"
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
  setIsObserveContainerCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  soundEnabled: boolean
  setSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>
}

export default function Overlay({
  isMobile,
  isChatsContainerCollapsed,
  setIsChatsContainerCollapsed,
  totalUnreadCount,
  setIsNewsContainerCollapsed,
  totalNewsUnreadCount,
  setIsObserveContainerCollapsed,
  soundEnabled,
  setSoundEnabled,
}: OverlayProps) {
  const [isHelpContainerCollapsed, setIsHelpContainerCollapsed] = useState(true)
  const [currentTime, setCurrentTime] = useState(getGameTime())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getGameTime())
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isChatsContainerCollapsed) {
        if (event.key.toLowerCase() === "i") {
          setIsNewsContainerCollapsed((prev) => !prev)
        } else if (event.key === "?") {
          event.preventDefault()
          setIsHelpContainerCollapsed((prev) => !prev)
        } else if (event.key === "m") {
          setSoundEnabled((prev) => !prev)
        } else if (event.key === "o") {
          setIsObserveContainerCollapsed((prev) => !prev)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isChatsContainerCollapsed, setIsNewsContainerCollapsed, setIsHelpContainerCollapsed])

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
            setIsObserveContainerCollapsed((prev) => !prev)
          }}
        >
          <img src={homeIcon} className={styles.buttonImage} />
        </button>
        <button
          className={`${styles.iconButton}`}
          onClick={(e) => {
            handleClick(e)
            setIsHelpContainerCollapsed((prev) => !prev)
          }}
        >
          <img src={hintsIcon} className={styles.buttonImage} />
        </button>
        <button
          className={`${styles.iconButton}`}
          onClick={(e) => {
            handleClick(e)
            setSoundEnabled((prev) => !prev)
          }}
        >
          <img src={soundEnabled ? soundOnIcon : soundOffIcon} className={styles.buttonImage} />
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
