import RecizeIcon from "../../../_images/chat/message/compose-resize.svg?react"
import SendIcon from "../../../_images/chat/message/compose-send.svg?react"
import localizations from "../../../_lib/localization"
import styles from "./styles.module.css"
import { FormEvent, useEffect, useRef } from "react"

export default function Compose({
  composeValue,
  setComposeValue,
  isLoading,
  onResizeClick,
  onSubmitUserMessage,
  isMobile,
}: {
  composeValue: string
  setComposeValue: (value: string) => void
  isLoading: boolean
  onResizeClick: () => void
  onSubmitUserMessage: (event: FormEvent<HTMLFormElement>) => void
  isMobile: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  return (
    <div className={styles.compose}>
      {/* {!isMobile && ( */}
      {/*   <button */}
      {/*     aria-label={localizations["en-US"].resize} */}
      {/*     className="askguru-small-btn" */}
      {/*     onClick={() => onResizeClick()} */}
      {/*   > */}
      {/*     <RecizeIcon width={24} height={24} /> */}
      {/*     {!isMobile && ( */}
      {/*       <div className={`askguru-tooltip ${styles.composeTooltipLeft}`}>{localizations["en-US"].resize}</div> */}
      {/*     )} */}
      {/*   </button> */}
      {/* )} */}
      <form style={{ display: "flex", gap: "8px", width: "100%" }} onSubmit={(event) => onSubmitUserMessage(event)}>
        <input
          type="text"
          name="Query Field"
          autoComplete="off"
          value={composeValue}
          onChange={(e) => setComposeValue(e.target.value)}
          placeholder={localizations["en-US"].inputPlaceholder}
          className={styles.input}
          ref={!isMobile ? inputRef : undefined}
        />
        <button
          aria-label={localizations["en-US"].send}
          type="submit"
          disabled={isLoading || !composeValue}
          className="askguru-small-btn"
        >
          <SendIcon width={28} height={28} />
          {!isMobile && (
            <div className={`askguru-tooltip ${styles.composeTooltipRight}`}>{localizations["en-US"].send}</div>
          )}
        </button>
      </form>
    </div>
  )
}
