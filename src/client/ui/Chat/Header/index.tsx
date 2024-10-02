import AskguruLogo from "../../_images/chat/header/askguru-logo.svg?react"
import CloseIcon from "../../_images/chat/header/close-icon.svg?react"
import RefreshIcon from "../../_images/chat/header/refresh-icon.svg?react"
import { Configuration } from "../../_interfaces"
import localizations from "../../_lib/localization"
import styles from "./styles.module.css"

export default function Header({
  configuration,
  onClearButtonClick,
  isMobile,
  onCollapseButtonClick,
}: {
  configuration: Configuration
  onClearButtonClick: () => void
  isMobile: boolean
  onCollapseButtonClick: () => void
}) {
  return (
    <div className={styles.header}>
      <div className={styles.heading}>
        {!configuration.whitelabel && <AskguruLogo height={36} width={36} style={{ objectFit: "contain" }} />}
        {configuration.windowHeading}
      </div>
      <div className={styles.buttons}>
        <button
          className="askguru-small-btn"
          onClick={() => onClearButtonClick()}
          aria-label={localizations[configuration.lang].clear}
        >
          <RefreshIcon height={18} width={18} />
          {!isMobile && (
            <div className={`askguru-tooltip ${styles.headerTooltip}`}>{localizations[configuration.lang].clear}</div>
          )}
        </button>
        <button
          className="askguru-small-btn"
          onClick={() => onCollapseButtonClick()}
          aria-label={localizations[configuration.lang].collapse}
        >
          <CloseIcon height={18} width={18} />
          {/* <div className={`askguru-tooltip ${styles.headerTooltip}`}>{localizations[configuration.lang].collapse}</div> */}
        </button>
      </div>
    </div>
  )
}
