import { CONFIG } from "../shared/config"
import { createRandomSpriteDefinition } from "../shared/functions"
import { roomsConfig } from "../shared/roomConfig"
import {
  AvailableGames,
  BroadcastMessage,
  ChatMessage,
  MapConfig,
  NewsItem,
  PlayerData,
  PlayerSpriteDefinition,
  availableGames,
} from "../shared/types"
import { IRefPhaserGame, PhaserGame } from "./game/PhaserGame"
import { supabase } from "./supabase"
import Authorize from "./ui/Authorize"
import ChatsContainer from "./ui/ChatsContainer"
import NewsContainer from "./ui/NewsContainer"
import ObserveContainer from "./ui/ObserveContainer"
import Overlay from "./ui/Overlay"
import { Session } from "@supabase/supabase-js"
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
  const [newsPaper, setNewsPaper] = useState<NewsItem[]>([])
  const [isNewsContainerCollapsed, setIsNewsContainerCollapsed] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem("soundEnabled") === "true")
  const [players, setPlayers] = useState<Map<string, PlayerData>>(new Map())

  const [observedNPC, setObservedNPC] = useState<string | null>(null)
  const [isObserveContainerCollapsed, setIsObserveContainerCollapsed] = useState(true)
  const [isObservedNPCCollapsed, setIsObservedNPCCollapsed] = useState(true)
  const [isObservedContainerExpanded, setIsObservedContainerExpanded] = useState(false)
  const [roomName, setRoomName] = useState<AvailableGames | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)

  const [mapConfig, setMapConfig] = useState<MapConfig | null>(null)
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null)

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
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error("Error fetching session:", error.message)
      } else {
        setSupabaseSession(data.session)
        if (data.session) {
          setUsername(data.session.user.email ? data.session.user.email.split("@")[0] : data.session.user.id)
        }
      }
    }
    fetchSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSupabaseSession(session)
      if (session) {
        setUsername(session.user.email ? session.user.email.split("@")[0] : session.user.id)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const path = window.location.pathname
    let gameName = (
      path === "/" || path === "" ? "" : path.startsWith("/") ? path.substring(1) : path
    ) as AvailableGames
    if (!availableGames.includes(gameName)) {
      gameName = CONFIG.DEFAULT_GAME as AvailableGames
      window.location.replace(`/${gameName}`)
      return
    }

    setRoomName(gameName)

    const params = new URLSearchParams(window.location.search)
    let initialRoomId = params.get("roomid") || ""

    const tempSocket = io(CONFIG.SERVER_URL, { autoConnect: false })

    tempSocket.on("connect", () => {
      console.log(`Connected to server with id: ${tempSocket.id}`)

      tempSocket.emit("getAvailableRooms", (rooms: string[]) => {
        console.log(`Available rooms: ${rooms}`)

        if (!rooms.includes(initialRoomId)) {
          tempSocket.emit("createRoom", gameName, (newRoomId: string) => {
            console.log(`Created new room with id: ${newRoomId}`)
            const newParams = new URLSearchParams(window.location.search)
            newParams.set("roomid", newRoomId)
            window.history.replaceState({}, "", `${window.location.pathname}?${newParams.toString()}`)
            setRoomId(newRoomId)
            tempSocket.disconnect()
          })
        } else {
          setRoomId(initialRoomId)
          tempSocket.disconnect()
        }

        setMapConfig(roomsConfig.find((room) => room.path === gameName)!.mapConfig)
      })
    })

    tempSocket.connect()
    // }
  }, [])

  useEffect(() => {
    if (!roomName || !roomId) return

    // We will be connecting in a Game Scene after
    // initializing listening methods
    const newSocket = io(CONFIG.SERVER_URL, { autoConnect: false })
    setSocket(newSocket)

    newSocket.on("connect", () => {
      console.log(`Connected to server with id: ${newSocket.id}`)
    })

    newSocket.on("playerJoined", (player: PlayerData) => {
      if (player.username !== username) {
        setPlayers((prevPlayers) => new Map(prevPlayers).set(player.username, player))
      }
    })

    newSocket.on("existingPlayers", (players: PlayerData[]) => {
      const playersMap = new Map(players.map((player) => [player.username, player]))
      setPlayers(playersMap)
    })

    newSocket.on("playerDataChanged", (player: PlayerData) => {
      setPlayers((prevPlayers) => {
        const currentPlayer = prevPlayers.get(player.username)
        if (player.npcState && currentPlayer?.npcState) {
          player.npcState = {
            ...currentPlayer.npcState,
            ...player.npcState,
          }
        }
        return new Map(prevPlayers).set(player.username, {
          ...currentPlayer,
          ...player,
        })
      })
    })

    newSocket.on("playerLeft", (username: string) => {
      setPlayers((prevPlayers) => {
        const newPlayers = new Map(prevPlayers)
        newPlayers.delete(username)
        return newPlayers
      })
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

    newSocket.on("news", (news: NewsItem | NewsItem[]) => {
      const ifNewsInitialization = Array.isArray(news)
      setNewsPaper((prevNews) => {
        const newsArray = Array.isArray(news) ? news : [news]
        const newNews = newsArray.map((newsItem) => ({
          ...newsItem,
          isRead: ifNewsInitialization || !isNewsContainerCollapsed,
        }))
        return [...prevNews, ...newNews]
      })
    })

    return () => {
      newSocket.off("newMessage")
      newSocket.disconnect()
    }
  }, [roomName, roomId])

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
    setNewsPaper((prevNews) => {
      const updatedNews = prevNews.map((news) => ({
        ...news,
        isRead: true,
      }))
      return updatedNews
    })
  }, [isNewsContainerCollapsed])

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

  const totalNewsUnreadCount = useMemo(() => {
    return newsPaper.filter((news) => !news.isRead).length
  }, [newsPaper])

  const handleGameLoaded = () => {
    setIsGameLoaded(true)
  }

  if (CONFIG.AUTH_ENABLED && !supabaseSession) {
    return <Authorize redirectTo={window.location.href} />
  }

  if (!socket) {
    return <div>Connecting to server...</div>
  }

  if (!roomId) {
    return <div>Getting room id...</div>
  }

  if (!mapConfig) {
    return <div>Map config is not set yet...</div>
  }

  return (
    <>
      <PhaserGame
        ref={phaserRef}
        mapConfig={mapConfig}
        username={username}
        spriteDefinition={spriteDefinition}
        socket={socket}
        roomId={roomId}
        currentActiveScene={currentScene}
        isChatContainerCollapsed={isChatsContainerCollapsed}
        setIsChatContainerCollapsed={setIsChatsContainerCollapsed}
        setIsChatCollapsed={setIsChatCollapsed}
        setChatmate={setChatmate}
        onGameLoaded={handleGameLoaded}
        soundEnabled={soundEnabled}
        setObservedNPC={setObservedNPC}
        setIsObserveContainerCollapsed={setIsObserveContainerCollapsed}
      />
      {isGameLoaded && (
        <Overlay
          isMobile={isMobile}
          isChatsContainerCollapsed={isChatsContainerCollapsed}
          setIsChatsContainerCollapsed={setIsChatsContainerCollapsed}
          totalUnreadCount={totalUnreadCount}
          setIsNewsContainerCollapsed={setIsNewsContainerCollapsed}
          totalNewsUnreadCount={totalNewsUnreadCount}
          setIsObserveContainerCollapsed={setIsObserveContainerCollapsed}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
        />
      )}
      {isGameLoaded && !isChatsContainerCollapsed && (
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
      {isGameLoaded && !isNewsContainerCollapsed && (
        <NewsContainer
          isMobile={isMobile}
          newsPaper={newsPaper}
          setIsNewsContainerCollapsed={setIsNewsContainerCollapsed}
        />
      )}
      {isGameLoaded && !isObserveContainerCollapsed && (
        <ObserveContainer
          NPCs={new Map(Array.from(players).filter(([_, player]) => player.isNPC))}
          observedNPC={observedNPC}
          setObservedNPC={setObservedNPC}
          setIsObserveContainerCollapsed={setIsObserveContainerCollapsed}
          isObservedNPCCollapsed={isObservedNPCCollapsed}
          setIsObservedNPCCollapsed={setIsObservedNPCCollapsed}
          isMobile={isMobile}
          isExpanded={isObservedContainerExpanded}
          setIsExpanded={setIsObservedContainerExpanded}
        />
      )}
    </>
  )
}

export default App
