import { IRefPhaserGame, PhaserGame } from "./game/PhaserGame"
import Chat from "./ui/Chat"
import React, { useEffect, useRef, useState } from "react"

type Role = "system" | "user" | "assistant"

const mobileWindowWidthThreshold = 450

export interface MessageType {
  role: Role
  content: string
  requestId?: string
}

function App() {
  const [isChatCollapsed, setIsChatCollapsed] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<MessageType[]>([])
  const [composeValue, setComposeValue] = useState("")
  const [isMessageLoading, setIsMessageLoading] = useState(false)

  const phaserRef = useRef<IRefPhaserGame | null>(null)
  const currentScene = (scene: Phaser.Scene) => {
    console.log(scene)
  }

  const messagesInitialState: MessageType[] = [{ role: "assistant", content: "lol" }]

  function handleResize() {
    setIsMobile(window.innerWidth < mobileWindowWidthThreshold)
  }

  function handleClearConversation() {
    setMessages(messagesInitialState)
    localStorage.setItem(`askguru-chat-history-TODO`, JSON.stringify(messagesInitialState))
  }

  useEffect(() => {
    const messagesHistory = localStorage.getItem(`askguru-chat-history-TODO`)
    if (messagesHistory) {
      setMessages(JSON.parse(messagesHistory))
    } else {
      setMessages(messagesInitialState)
    }

    handleResize()
    window.addEventListener("resize", () => handleResize())
    return () => {
      window.removeEventListener("resize", () => handleResize())
    }
  }, [])

  return (
    <>
      <div id="app">
        <PhaserGame
          ref={phaserRef}
          currentActiveScene={currentScene}
          isChatCollapsed={isChatCollapsed}
          setIsChatCollapsed={setIsChatCollapsed}
        />
      </div>
      {!isChatCollapsed && (
        <Chat
          isCollapsed={isChatCollapsed}
          setIsCollapsed={setIsChatCollapsed}
          isMobile={isMobile}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          messages={messages}
          setMessages={setMessages}
          composeValue={composeValue}
          setComposeValue={setComposeValue}
          isMessageLoading={isMessageLoading}
          setIsMessageLoading={setIsMessageLoading}
          handleClearConversation={handleClearConversation}
        />
      )}
    </>
  )
}

export default App
