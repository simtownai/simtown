import { PlayerSpriteDefinition } from "../../../shared/types"
import { SpritePreviewGame } from "../SpritePreview/SpritePreviewGame"
import styles from "./styles.module.css"
import { Session } from "@supabase/supabase-js"

interface HeaderDashboardProps {
  username: string
  spriteDefinition: PlayerSpriteDefinition
  session: Session | null
  showAuthContainer: () => void
}

export function HeaderDashboard({ username, spriteDefinition, session, showAuthContainer }: HeaderDashboardProps) {
  if (!session) {
    return (
      <header className={styles.header}>
        <div className={styles.welcomeSection}>
          <span className={styles.welcomeText}>
            <strong onClick={showAuthContainer}>Log in</strong> to save your messages and customize your avatar
          </span>
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
      <div className={styles.spriteSection}>
        <SpritePreviewGame username={username} spriteDefinition={spriteDefinition} width={82} height={82} />
      </div>
    </header>
  )
}
