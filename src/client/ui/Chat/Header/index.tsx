import CloseIcon from "../../_images/chat/header/close-icon.svg?react"
import RefreshIcon from "../../_images/chat/header/refresh-icon.svg?react"
import styles from "./styles.module.css"

export default function Header({
  isMobile,
  text,
  onCollapseButtonClick,
  onBackButtonClick,
  onClearButtonClick,
}: {
  isMobile: boolean
  text: string
  onCollapseButtonClick: (() => void) | null
  onBackButtonClick: (() => void) | null
  onClearButtonClick: (() => void) | null
}) {
  return (
    <div className={styles.header}>
      {onBackButtonClick && (
        <button className="askguru-small-btn" onClick={() => onBackButtonClick()} aria-label="Back">
          <CloseIcon height={18} width={18} />
          {!isMobile && <div className={`askguru-tooltip ${styles.headerTooltip}`}>Back</div>}
        </button>
      )}
      <div className={styles.heading}>{text}</div>
      <div className={styles.buttons}>
        {onClearButtonClick && (
          <button className="askguru-small-btn" onClick={() => onClearButtonClick()} aria-label="Clear conversation">
            <RefreshIcon height={18} width={18} />
            {!isMobile && <div className={`askguru-tooltip ${styles.headerTooltip}`}>"Clear conversation"</div>}
          </button>
        )}
        {onCollapseButtonClick && (
          <button className="askguru-small-btn" onClick={() => onCollapseButtonClick()} aria-label="Collapse">
            <CloseIcon height={18} width={18} />
            {/* <div className={`askguru-tooltip ${styles.headerTooltip}`}>{localizations[configuration.lang].collapse}</div> */}
          </button>
        )}
      </div>
    </div>
  )
}
