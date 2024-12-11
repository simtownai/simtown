import { getTextFromAction } from "../../../../shared/functions"
import { PlayerData } from "../../../../shared/types"
import Header from "../../OverlayHeader"
import NPCListItem from "./NPCListItem"
import styles from "./styles.module.css"
import React, { useEffect, useMemo } from "react"

interface NPCListProps {
  isMobile: boolean
  NPCs: Map<string, PlayerData>
  observedNPC: string | null
  setObservedNPC: (value: string) => void
  setIsObservedNPCCollapsed: (value: boolean) => void
  setIsObserveContainerCollapsed: (value: boolean) => void
}

const NPCList: React.FC<NPCListProps> = ({
  isMobile,
  NPCs,
  observedNPC,
  setObservedNPC,
  setIsObservedNPCCollapsed,
  setIsObserveContainerCollapsed,
}) => {
  const NPCsSorted = useMemo(() => {
    return Array.from(NPCs.values()).sort((a, b) => a.username.localeCompare(b.username))
  }, [NPCs])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key >= "1" && event.key <= "9") {
        const index = parseInt(event.key) - 1
        if (index < NPCsSorted.length) {
          const selectedNPC = NPCsSorted[index].username
          setObservedNPC(selectedNPC)
          setIsObservedNPCCollapsed(false)
          event.preventDefault()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [NPCsSorted, setObservedNPC, setIsObservedNPCCollapsed])

  return (
    <div className={`${styles.chatList} ${isMobile ? styles.chatListMobile : styles.chatListDesktop}`}>
      <Header
        isMobile={isMobile}
        text="NPCs"
        onCollapseButtonClick={isMobile ? () => setIsObserveContainerCollapsed(true) : null}
        onBackButtonClick={null}
        onClearButtonClick={null}
      />
      {NPCsSorted.length !== 0 ? (
        <ul className={styles.list}>
          {NPCsSorted.map(({ username, action }, index) => (
            <NPCListItem
              key={username}
              name={username}
              lastAction={getTextFromAction(action)}
              isActive={observedNPC === username}
              onClick={() => {
                setObservedNPC(username)
                setIsObservedNPCCollapsed(false)
              }}
            />
          ))}
        </ul>
      ) : (
        <div className={styles.placeholder}>You don't have any messages yet</div>
      )}
    </div>
  )
}

export default NPCList
