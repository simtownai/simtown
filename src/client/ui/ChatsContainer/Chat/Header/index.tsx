import CloseIcon from "../../../_images/chat/header/close-icon.svg?react"
import RefreshIcon from "../../../_images/chat/header/refresh-icon.svg?react"
import RecizeIcon from "../../../_images/chat/message/compose-resize.svg?react"
import localizations from "../../../_lib/localization"
import styles from "./styles.module.css"

export default function Header({
  isMobile,
  text,
  onCollapseButtonClick,
  onBackButtonClick,
  onClearButtonClick,
  onResizeButtonClick,
}: {
  isMobile: boolean
  text: string
  onCollapseButtonClick: (() => void) | null
  onBackButtonClick: (() => void) | null
  onClearButtonClick: (() => void) | null
  onResizeButtonClick?: () => void
}) {
  return (
    <div className={styles.header}>
      {onBackButtonClick && (
        <button className="askguru-small-btn" onClick={() => onBackButtonClick()} aria-label="Back">
          <span className={styles.rotatedIcon}>
            <CloseIcon height={18} width={18} />
          </span>
          {!isMobile && <div className={`askguru-tooltip ${styles.headerTooltip}`}>Back</div>}
        </button>
      )}
      <div className={styles.heading}>{text}</div>
      <div className={styles.buttons}>
        {!isMobile && onResizeButtonClick && (
          <button
            aria-label={localizations["en-US"].resize}
            className="askguru-small-btn"
            onClick={() => onResizeButtonClick()}
          >
            <RecizeIcon width={24} height={24} />
            {!isMobile && (
              <div className={`askguru-tooltip ${styles.composeTooltipLeft}`}>{localizations["en-US"].resize}</div>
            )}
          </button>
        )}
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
