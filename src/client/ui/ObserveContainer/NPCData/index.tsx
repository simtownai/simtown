import { getTextFromAction } from "../../../../shared/functions"
import { PlayerData } from "../../../../shared/types"
import Header from "../../ChatsContainer/Chat/Header"
import styles from "./styles.module.css"

export default function NPCData({
  observedNPCData,
  setObservedNPC,
  setIsObserveContainerCollapsed,
  setIsObservedNPCCollapsed,
  isMobile,
  isExpanded,
  setIsExpanded,
}: {
  observedNPCData: PlayerData | null
  setObservedNPC: (value: string | null) => void
  setIsObserveContainerCollapsed: (value: boolean) => void
  setIsObservedNPCCollapsed: (value: boolean) => void
  isMobile: boolean
  isExpanded: boolean
  setIsExpanded: (value: boolean) => void
}) {
  function handleCollapseButtonClick() {
    setIsObserveContainerCollapsed(true)
  }

  function handleResizeClick() {
    setIsExpanded(!isExpanded)
  }

  console.log(observedNPCData)

  return (
    <div className={styles.chat}>
      <Header
        isMobile={isMobile}
        text={observedNPCData?.username || ""}
        onCollapseButtonClick={handleCollapseButtonClick}
        onBackButtonClick={
          isMobile
            ? () => {
                setIsObservedNPCCollapsed(true)
                setObservedNPC(null)
              }
            : null
        }
        onClearButtonClick={null}
        onResizeButtonClick={handleResizeClick}
      />
      <div className={styles.content}>
        {observedNPCData && observedNPCData.npcState ? (
          <div className={styles.section}>
            {observedNPCData.npcState.backstory && (
              <>
                <h2>Backstory</h2>
                <ul>
                  {observedNPCData.npcState.backstory.map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              </>
            )}
            {observedNPCData.npcState.reflections && (
              <>
                <h2>Reflections</h2>
                <ul>
                  {observedNPCData.npcState.reflections.map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              </>
            )}
            {observedNPCData.npcState.plan && (
              <>
                <h2>Plan</h2>
                <ul>
                  {observedNPCData.npcState.plan.map((line, index) => (
                    <li key={index}>{getTextFromAction(line)}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <div className={styles.placeholder}>Select an NPC to start observing</div>
        )}
      </div>
    </div>
  )
}
