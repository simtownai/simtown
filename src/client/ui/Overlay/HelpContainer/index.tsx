import Header from "../../ChatsContainer/Chat/Header"
import styles from "./styles.module.css"
import React, { useEffect, useMemo } from "react"

interface HelpContainerProps {
  isMobile: boolean
  setIsHelpContainerCollapsed: (value: boolean) => void
}

const HelpContainer: React.FC<HelpContainerProps> = ({ isMobile, setIsHelpContainerCollapsed }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsHelpContainerCollapsed(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [setIsHelpContainerCollapsed])

  const containerStyle = useMemo(() => {
    if (!isMobile) {
      const width = "450px"
      const height = "650px"
      const maxWidth = "calc(100vw - 40px)"
      const maxHeight = "calc(100vh - 40px)"
      return {
        width,
        height,
        maxWidth,
        maxHeight,
      }
    }
    return {}
  }, [isMobile])

  return (
    <div
      className={`${styles.container} ${isMobile ? styles.mobileContainer : styles.desktopContainer}`}
      style={containerStyle}
    >
      <Header
        isMobile={isMobile}
        text="Help"
        onCollapseButtonClick={() => setIsHelpContainerCollapsed(true)}
        onBackButtonClick={null}
        onClearButtonClick={null}
      />
      <div className={styles.content}>
        <p className={styles.description}>Learn how to navigate and interact in the game.</p>

        <div className={styles.section}>
          <h2>Controls</h2>
          <ul className={styles.controlsList}>
            <li>
              <span className={styles.key}>?</span> - Toggle help menu
            </li>
            <li>
              <span className={styles.key}>W</span> <span className={styles.key}>A</span>{" "}
              <span className={styles.key}>S</span> <span className={styles.key}>D</span> /{" "}
              <span className={styles.key}>H</span> <span className={styles.key}>J</span>{" "}
              <span className={styles.key}>K</span> <span className={styles.key}>L</span> /{" "}
              <span className={styles.key}>Arrow Keys</span> - Move
            </li>
            <li>
              <span className={styles.key}>C</span> - Open chat with closest player if in range, else open chat window
            </li>
            <li>
              <span className={styles.key}>I</span> - Toggle news container
            </li>
            <li>
              <span className={styles.key}>M</span> - Toggle sound
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default HelpContainer
