import styles from "./styles.module.css"

export default function CenteredText({ text }: { text: string }) {
  return (
    <div className={styles.centeredContainer}>
      <div className={styles.centeredText}>{text}</div>
    </div>
  )
}
