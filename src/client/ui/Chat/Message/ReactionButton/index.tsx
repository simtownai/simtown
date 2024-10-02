import DislikeIcon from "../../../_images/chat/message/feedback-dislike.svg?react"
import LikeIcon from "../../../_images/chat/message/feedback-like.svg?react"
import { ReactionType } from "../../../_interfaces"
import styles from "./styles.module.css"
import React, { useState } from "react"

export default function ReactionButton({
  reaction,
  hoverColor,
  onButtonClick,
}: {
  reaction: ReactionType
  hoverColor: string
  onButtonClick: (reaction: ReactionType) => void
}) {
  const [hoverReactionButton, setHoverReactionButton] = useState(false)
  return (
    <button
      className={styles.messageRatingButton}
      style={{
        backgroundColor: hoverReactionButton ? hoverColor : "",
        color: hoverReactionButton ? "white" : "rgb(56, 56, 56)",
      }}
      onMouseEnter={() => setHoverReactionButton(true)}
      onMouseLeave={() => setHoverReactionButton(false)}
      onClick={() => onButtonClick(reaction)}
    >
      {reaction === "LIKE" ? (
        <>
          <LikeIcon height={18} width={18} />
          Like
        </>
      ) : (
        <>
          <DislikeIcon height={18} width={18} />
          Dislike
        </>
      )}
    </button>
  )
}
