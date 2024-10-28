import { CONFIG } from "../shared/config"
import { createRandomSpriteDefinition } from "../shared/functions"
import { BroadcastMessage, ChatMessage, PlayerSpriteDefinition } from "../shared/types"
import { IRefPhaserGame, PhaserGame } from "./game/PhaserGame"
import ChatsContainer from "./ui/ChatsContainer"
import Overlay from "./ui/Overlay"
import { useEffect, useMemo, useRef, useState } from "react"
import io, { Socket } from "socket.io-client"

const mobileWindowWidthThreshold = 450

function App() {
  const [isGameLoaded, setIsGameLoaded] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [username, setUsername] = useState<string>("Player" + Math.floor(Math.random() * 1000) + 1)
  const [spriteDefinition, setSpriteDefinition] = useState<PlayerSpriteDefinition>(createRandomSpriteDefinition())
  const [chatmate, setChatmate] = useState<string | null>(null)
  const [isChatsContainerCollapsed, setIsChatsContainerCollapsed] = useState(true)
  const [isChatCollapsed, setIsChatCollapsed] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Map<string, ChatMessage[]>>(new Map())
  const [composeValue, setComposeValue] = useState("")
  const [isMessageLoading, setIsMessageLoading] = useState(false)

  const phaserRef = useRef<IRefPhaserGame | null>(null)

  const chatmateRef = useRef(chatmate)
  const isChatsContainerCollapsedRef = useRef(isChatsContainerCollapsed)
  const isChatCollapsedRef = useRef(isChatCollapsed)
  useEffect(() => {
    chatmateRef.current = chatmate
  }, [chatmate])
  useEffect(() => {
    isChatsContainerCollapsedRef.current = isChatsContainerCollapsed
  }, [isChatsContainerCollapsed])
  useEffect(() => {
    isChatCollapsedRef.current = isChatCollapsed
  }, [isChatCollapsed])

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
        const newMessage = {
          ...message,
          isRead:
            !isChatsContainerCollapsedRef.current &&
            !isChatCollapsedRef.current &&
            chatmateRef.current === message.from,
        } as ChatMessage
        const newMessages = [...oldMessages, newMessage]
        return new Map(prevMessages).set(message.from, newMessages)
      })
    })

    newSocket.on("overhearMessage", (message: ChatMessage) => {
      setMessages((prevMessages) => {
        const [first, second] = [message.from, message.to].sort()
        const key = `${first}-${second} (overheard)`
        const oldMessages = prevMessages.get(key) || []
        const newMessage = {
          ...message,
          isRead: !isChatsContainerCollapsedRef.current && !isChatCollapsedRef.current && chatmateRef.current === key,
        } as ChatMessage
        const newMessages = [...oldMessages, newMessage]
        return new Map(prevMessages).set(key, newMessages)
      })
    })

    newSocket.on("listenBroadcast", (message: BroadcastMessage) => {
      setMessages((prevMessages) => {
        const key = `${message.from} (broadcast)`
        const oldMessages = prevMessages.get(key) || []
        const newMessage = {
          to: username,
          ...message,
          isRead: !isChatsContainerCollapsedRef.current && !isChatCollapsedRef.current && chatmateRef.current === key,
        } as ChatMessage
        const newMessages = [...oldMessages, newMessage]
        return new Map(prevMessages).set(key, newMessages)
      })
    })

    newSocket.on("endConversation", (message: ChatMessage) => {
      setMessages((prevMessages) => {
        const oldMessages = prevMessages.get(message.from) || []
        const newMessage = {
          ...message,
          isRead:
            !isChatsContainerCollapsedRef.current &&
            !isChatCollapsedRef.current &&
            chatmateRef.current === message.from,
        } as ChatMessage
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
    handleResize()
    const resizeListener = () => handleResize()
    window.addEventListener("resize", resizeListener)
    return () => {
      window.removeEventListener("resize", resizeListener)
    }
  }, [])

  useEffect(() => {
    if (chatmate) {
      setMessages((prevMessages) => {
        const userMessages = prevMessages.get(chatmate)
        if (!userMessages) return prevMessages

        const updatedMessages = userMessages.map((msg) => ({
          ...msg,
          isRead: true,
        }))
        return new Map(prevMessages).set(chatmate, updatedMessages)
      })
    }
  }, [isChatsContainerCollapsed, isChatCollapsed, chatmate])

  useEffect(() => {
    if (username) {
      localStorage.setItem(`chat-history-${username}`, JSON.stringify(Array.from(messages.entries())))
    }
  }, [messages])

  useEffect(() => {
    if (username) {
      const messagesHistory = localStorage.getItem(`chat-history-${username}`)
      if (messagesHistory) {
        setMessages(new Map(JSON.parse(messagesHistory)))
      }
    }
  }, [socket])

  const totalUnreadCount = useMemo(() => {
    let count = 0
    messages.forEach((chatMessages) => {
      count += chatMessages.filter((msg) => msg.from !== username && !msg.isRead).length
    })
    return count
  }, [messages])

  const handleGameLoaded = () => {
    setIsGameLoaded(true)
  }

  return (
    <>
      {socket && (
        <PhaserGame
          ref={phaserRef}
          username={username}
          spriteDefinition={spriteDefinition}
          socket={socket}
          currentActiveScene={currentScene}
          isChatContainerCollapsed={isChatsContainerCollapsed}
          setIsChatContainerCollapsed={setIsChatsContainerCollapsed}
          setIsChatCollapsed={setIsChatCollapsed}
          setChatmate={setChatmate}
          onGameLoaded={handleGameLoaded}
        />
      )}
      {socket && isGameLoaded && (
        <Overlay
          isMobile={isMobile}
          isChatsContainerCollapsed={isChatsContainerCollapsed}
          setIsChatsContainerCollapsed={setIsChatsContainerCollapsed}
          totalUnreadCount={totalUnreadCount}
        />
      )}
      {socket && isGameLoaded && !isChatsContainerCollapsed && (
        <ChatsContainer
          socket={socket}
          username={username}
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
