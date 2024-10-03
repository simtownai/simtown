import { CONFIG } from "../shared/config"
import { IRefPhaserGame, PhaserGame } from "./game/PhaserGame"
import Chat from "./ui/Chat"
import { useEffect, useRef, useState } from "react"
import io, { Socket } from "socket.io-client"

type Role = "system" | "user" | "assistant"

const mobileWindowWidthThreshold = 450

export interface MessageType {
  role: Role
  content: string
  requestId?: string
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [chatmate, setChatmate] = useState<string | null>(null)
  const [isChatCollapsed, setIsChatCollapsed] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Map<string, MessageType[]>>(new Map())
  const [composeValue, setComposeValue] = useState("")
  const [isMessageLoading, setIsMessageLoading] = useState(false)

  const phaserRef = useRef<IRefPhaserGame | null>(null)
  const currentScene = (scene: Phaser.Scene) => {
    console.log(scene)
  }

  useEffect(() => {
    // We will be connecting in a Game Scene after
    // initializing listening methods
    const newSocket = io(CONFIG.SERVER_URL, { autoConnect: false })
    setSocket(newSocket)

    newSocket.on("connect", () => {
      console.log(`Connected to server with id: ${newSocket.id}`)
    })

    newSocket.on("newMessage", (message: { from: string; to: string; message: string }) => {
      const newMessage: MessageType = {
        role: "assistant",
        content: message.message,
      }
      setMessages((prevMessages) => {
        const oldMessages = prevMessages.get(message.from) || []
        const newMessages = [...oldMessages, newMessage]
        return new Map(prevMessages).set(message.from, newMessages)
      })
    })

    return () => {
      newSocket.off("newMessage")
      newSocket.disconnect()
    }
  }, [])

  function handleResize() {
    setIsMobile(window.innerWidth < mobileWindowWidthThreshold)
  }

  useEffect(() => {
    if (socket) {
      localStorage.setItem(`chat-history-${socket.id}`, JSON.stringify(Array.from(messages.entries())))
    }
  }, [messages])

  useEffect(() => {
    if (socket) {
      const messagesHistory = localStorage.getItem(`chat-history-${socket.id}`)
      if (messagesHistory) {
        setMessages(new Map(JSON.parse(messagesHistory)))
      }
    }
  }, [socket])

  useEffect(() => {
    handleResize()
    const resizeListener = () => handleResize()
    window.addEventListener("resize", resizeListener)
    return () => {
      window.removeEventListener("resize", resizeListener)
    }
  }, [])

  return (
    <>
      {socket && (
        <PhaserGame
          ref={phaserRef}
          socket={socket}
          currentActiveScene={currentScene}
          isChatCollapsed={isChatCollapsed}
          setIsChatCollapsed={setIsChatCollapsed}
          setChatmate={setChatmate}
        />
      )}
      {socket && !isChatCollapsed && chatmate && (
        <Chat
          socket={socket}
          chatmate={chatmate}
          setIsCollapsed={setIsChatCollapsed}
          isMobile={isMobile}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          messages={messages.get(chatmate) || []}
          setMessages={(newMessages) =>
            setMessages((prevMessages) => {
              prevMessages.set(chatmate, newMessages)
              return new Map(prevMessages)
            })
          }
          composeValue={composeValue}
          setComposeValue={setComposeValue}
          isMessageLoading={isMessageLoading}
          setIsMessageLoading={setIsMessageLoading}
          handleClearConversation={null}
        />
      )}
    </>
  )
}

export default App
