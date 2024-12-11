import { PlayerSpriteDefinition } from "../../../shared/types"
import { useMobileBreakpoint } from "../../hooks/useMobileBreakpoint"
import { SpritePreviewGame } from "../SpritePreview/SpritePreviewGame"
import Randomize from "../_images/auth/randomize.png"
import Save from "../_images/auth/save.png"
import styles from "./styles.module.css"
import { Session } from "@supabase/supabase-js"
import { useState } from "react"

interface HeaderDashboardProps {
  username: string
  spriteDefinition: PlayerSpriteDefinition
  session: Session | null
  showAuthContainer: () => void
  onRandomize?: () => void
  onSave?: () => void
}

export function HeaderDashboard({
  username,
  spriteDefinition,
  session,
  showAuthContainer,
  onRandomize,
  onSave,
}: HeaderDashboardProps) {
  const isMobile = useMobileBreakpoint()
  const iconSize = isMobile ? 24 : 48
  const [hasRandomized, setHasRandomized] = useState(false)

  const handleRandomize = () => {
    setHasRandomized(true)
    onRandomize?.()
  }

  if (!session) {
    return (
      <header className={styles.header}>
        <div className={styles.welcomeSection}>
          <span className={styles.welcomeText}>
            <strong onClick={showAuthContainer}>Log in</strong> to save your messages and customize your avatar
          </span>
        </div>
        <div className={styles.spriteControls}>
          <button className={styles.iconButton} onClick={onRandomize}>
            <img className={styles.buttonImage} src={Randomize} alt="Randomize" />
          </button>
          <div className={styles.spriteSection}>
            <SpritePreviewGame username={username} spriteDefinition={spriteDefinition} width={82} height={82} />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className={styles.header}>
      <div className={styles.welcomeSection}>
        <span className={styles.welcomeText}>Welcome back:</span>
        <span className={styles.username}>{username}</span>
      </div>
      <div className={styles.spriteContainer}>
        <div className={styles.spriteControls}>
          <button
            className={`${styles.iconButton} ${!hasRandomized ? styles.iconButtonDisabled : ""}`}
            onClick={onSave}
            disabled={!hasRandomized}
            title="Save your avatar"
          >
            <img className={styles.buttonImage} src={Save} alt="Save" />
          </button>
          <button className={styles.iconButton} onClick={handleRandomize} title="Randomize your avatar">
            <img className={styles.buttonImage} src={Randomize} alt="Randomize" />
          </button>
          <div className={styles.spriteSection}>
            <SpritePreviewGame username={username} spriteDefinition={spriteDefinition} width={82} height={82} />
          </div>
        </div>
      </div>
    </header>
  )
}
