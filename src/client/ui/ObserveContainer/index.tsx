import { PlayerData } from "../../../shared/types"
import NPCData from "./NPCData"
import NPCList from "./NPCList"
import styles from "./styles.module.css"
import React, { useEffect, useMemo } from "react"

interface ObserveContainerProps {
  NPCs: Map<string, PlayerData>
  observedNPC: string | null
  setObservedNPC: (value: string | null) => void
  setIsObserveContainerCollapsed: (value: boolean) => void
  isObservedNPCCollapsed: boolean
  setIsObservedNPCCollapsed: (value: boolean) => void
  isMobile: boolean
  isExpanded: boolean
  setIsExpanded: (value: boolean) => void
}

const ObserveContainer: React.FC<ObserveContainerProps> = ({
  NPCs,
  observedNPC,
  setObservedNPC,
  setIsObserveContainerCollapsed,
  isObservedNPCCollapsed,
  setIsObservedNPCCollapsed,
  isMobile,
  isExpanded,
  setIsExpanded,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsObserveContainerCollapsed(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [setIsObserveContainerCollapsed])

  const containerStyle = useMemo(() => {
    if (!isMobile) {
      const width = isExpanded ? "calc(100vw - 40px)" : "750px"
      const height = isExpanded ? "calc(100vh - 40px)" : "650px"
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
  }, [isMobile, isExpanded])

  return (
    <div
      className={`${styles.container} ${isMobile ? styles.mobileContainer : styles.desktopContainer}`}
      style={containerStyle}
    >
      <div className={styles.content}>
        {(!isMobile || isObservedNPCCollapsed) && (
          <div className={styles.chatsListWrapper}>
            <NPCList
              isMobile={isMobile}
              NPCs={NPCs}
              observedNPC={observedNPC}
              setObservedNPC={setObservedNPC}
              setIsObserveContainerCollapsed={setIsObserveContainerCollapsed}
              setIsObservedNPCCollapsed={setIsObservedNPCCollapsed}
            />
          </div>
        )}
        {(!isMobile || !isObservedNPCCollapsed) && (
          <div
            className={`${styles.chatWrapper} ${
              isMobile
                ? styles.chatWrapperMobile
                : `${styles.chatWrapperDesktop} ${isExpanded ? styles.chatWrapperDesktopExpanded : styles.chatWrapperDesktopNormal}`
            }`}
          >
            <NPCData
              observedNPCData={NPCs.get(observedNPC || "") || null}
              setObservedNPC={setObservedNPC}
              setIsObserveContainerCollapsed={setIsObserveContainerCollapsed}
              setIsObservedNPCCollapsed={setIsObservedNPCCollapsed}
              isMobile={isMobile}
              isExpanded={isExpanded}
              setIsExpanded={setIsExpanded}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default ObserveContainer
