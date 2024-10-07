import chatsIcon from "../_images/overlay/chats-icon.png"
import hintsIcon from "../_images/overlay/hints-icon.png"
import HelpContainer from "./HelpContainer"
import styles from "./styles.module.css"
import React, { useEffect, useState } from "react"

interface OverlayProps {
  isMobile: boolean
  isChatsContainerCollapsed: boolean
  setIsChatsContainerCollapsed: React.Dispatch<React.SetStateAction<boolean>>
}

export default function Overlay({ isMobile, isChatsContainerCollapsed, setIsChatsContainerCollapsed }: OverlayProps) {
  const [isHelpContainerCollapsed, setIsHelpContainerCollapsed] = useState(true)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    button.classList.add(styles.clicked)
    setTimeout(() => {
      button.classList.remove(styles.clicked)
    }, 100)
  }

  // Disable when chat opened
  // useEffect(() => {
  //   const handleKeyDown = (event: KeyboardEvent) => {
  //     if (event.key === "?") {
  //       setIsHelpContainerCollapsed((prev) => !prev)
  //     }
  //   }

  //   window.addEventListener("keydown", handleKeyDown)

  //   return () => {
  //     window.removeEventListener("keydown", handleKeyDown)
  //   }
  // }, [setIsHelpContainerCollapsed])

  return (
    <>
      <div className={`${styles.overlay} ${styles.overlayTop}`}>
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
      <div className={`${styles.overlay} ${styles.overlayBottom}`}>
        {isChatsContainerCollapsed && (
          <button
            className={`${styles.iconButton}`}
            onClick={(e) => {
              handleClick(e)
              setIsChatsContainerCollapsed((prev) => !prev)
            }}
          >
            <img src={chatsIcon} className={styles.buttonImage} />
          </button>
        )}
      </div>
      {!isHelpContainerCollapsed && (
        <HelpContainer isMobile={isMobile} setIsHelpContainerCollapsed={setIsHelpContainerCollapsed} />
      )}
    </>
  )
}
