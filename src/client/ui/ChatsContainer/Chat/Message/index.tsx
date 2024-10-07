import { ChatMessage } from "../../../../../shared/types"
import TripleDots from "./TripleDots"
import styles from "./styles.module.css"

export default function Message({
  message,
  isLoading,
  isFirstInGroup,
  ifMessageIsFromUser,
}: {
  message: ChatMessage
  isLoading: boolean
  isFirstInGroup: boolean
  ifMessageIsFromUser: boolean
}) {
  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()

    let hours = date.getHours()
    const minutes = String(date.getMinutes()).padStart(2, "0")

    const ampm = hours >= 12 ? "PM" : "AM"
    hours = hours % 12
    hours = hours ? hours : 12 // the hour '0' should be '12'
    const hoursStr = String(hours).padStart(2, "0")

    return `${day}/${month}/${year} ${hoursStr}:${minutes} ${ampm}`
  }
  return (
    <div className={styles.messageContainer}>
      <div className={styles.message}>
        {isFirstInGroup && (
          <div className={styles.titleRow}>
            <span className={`${styles.messageSender} ${ifMessageIsFromUser ? styles.senderWe : styles.senderNotWe}`}>
              {message.from}
            </span>
            <span className={styles.messageDate}>{formatDate(message.date)}</span>
          </div>
        )}

        <p>{message.message}</p>
        {isLoading && <TripleDots />}
      </div>
    </div>
  )
}
