import { PlayerSpriteDefinition } from "../../../shared/types"
import { SpritePreview } from "../../game/scenes/SpritePreview"
import styles from "./SpritePreviewGame.module.css"
import Phaser from "phaser"
import { useEffect, useRef, useState } from "react"

interface SpritePreviewGameProps {
  username: string
  spriteDefinition: PlayerSpriteDefinition
  width?: number
  height?: number
}

export function SpritePreviewGame({ username, spriteDefinition, width = 100, height = 100 }: SpritePreviewGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!containerRef.current) return

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width,
      height,
      transparent: true,
      scene: [new SpritePreview(username, spriteDefinition)],
    }

    gameRef.current = new Phaser.Game(config)

    // Listen for the scene to be created
    gameRef.current.events.once("ready", () => {
      setIsLoading(false)
    })

    return () => {
      gameRef.current?.destroy(true)
    }
  }, [username, spriteDefinition, width, height])

  return (
    <div className={styles.container} style={{ width, height }}>
      <div ref={containerRef} className={styles.gameContainer} />
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner} />
        </div>
      )}
    </div>
  )
}
