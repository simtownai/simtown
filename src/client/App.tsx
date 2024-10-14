import { CONFIG } from "../shared/config"
import { ChatMessage } from "../shared/types"
import { IRefPhaserGame, PhaserGame } from "./game/PhaserGame"
import ChatsContainer from "./ui/ChatsContainer"
import Overlay from "./ui/Overlay"
import { useEffect, useRef, useState } from "react"
import io, { Socket } from "socket.io-client"

const mobileWindowWidthThreshold = 450

function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [chatmate, setChatmate] = useState<string | null>(null)
  const [isChatsContainerCollapsed, setIsChatsContainerCollapsed] = useState(true)
  const [isChatCollapsed, setIsChatCollapsed] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Map<string, ChatMessage[]>>(new Map())
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

    newSocket.on("newMessage", (message: ChatMessage) => {
      setMessages((prevMessages) => {
        const oldMessages = prevMessages.get(message.from) || []
        const newMessages = [...oldMessages, message]
        return new Map(prevMessages).set(message.from, newMessages)
      })
    })
    newSocket.on("endConversation", (message: ChatMessage) => {
      setMessages((prevMessages) => {
        const oldMessages = prevMessages.get(message.from) || []
        const newMessages = [...oldMessages, message]
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
    if (socket && socket.id !== undefined) {
      localStorage.setItem(`chat-history-${socket.id}`, JSON.stringify(Array.from(messages.entries())))
    }
  }, [messages])

  useEffect(() => {
    if (socket && socket.id !== undefined) {
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
          isChatContainerCollapsed={isChatsContainerCollapsed}
          setIsChatContainerCollapsed={setIsChatsContainerCollapsed}
          setIsChatCollapsed={setIsChatCollapsed}
          setChatmate={setChatmate}
        />
      )}
      {socket && (
        <Overlay
          isMobile={isMobile}
          isChatsContainerCollapsed={isChatsContainerCollapsed}
          setIsChatsContainerCollapsed={setIsChatsContainerCollapsed}
        />
      )}
      {socket && !isChatsContainerCollapsed && (
        <ChatsContainer
          socket={socket}
          chatmate={chatmate}
          setChatmate={setChatmate}
          setIsChatsContainerCollapsed={setIsChatsContainerCollapsed}
          isChatCollapsed={isChatCollapsed}
          setIsChatCollapsed={setIsChatCollapsed}
          isMobile={isMobile}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          messages={messages}
          setMessages={setMessages}
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
