import { SpritePreviewGame, SpritePreviewGameProps } from "../SpritePreview/SpritePreviewGame"
import styles from "./styles.module.css"

interface AvatarHorizontalListProps {
  npcs: SpritePreviewGameProps[]
}

export default function AvatarHorizontalList({ npcs }: AvatarHorizontalListProps) {
  if (!npcs || npcs.length === 0) return null

  return (
    <div className={styles.npcSprites}>
      {npcs.map((npc) => (
        <div key={npc.username} className={styles.npcSpriteContainer}>
          <SpritePreviewGame username={npc.username} spriteDefinition={npc.spriteDefinition} width={48} height={48} />
          <span className={styles.npcName}>{npc.username}</span>
        </div>
      ))}
    </div>
  )
}
