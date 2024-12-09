import { CONFIG } from "../shared/config"
import { createRandomSpriteDefinition } from "../shared/functions"
import { Tables } from "../shared/supabase-types"
import { BroadcastMessage, ChatMessage, NewsItem, PlayerData, PlayerSpriteDefinition } from "../shared/types"
import { IRefPhaserGame, PhaserGame } from "./game/PhaserGame"
import { supabase } from "./supabase"
import Authorize from "./ui/Authorize"
import ChatsContainer from "./ui/ChatsContainer"
import NewsContainer from "./ui/NewsContainer"
import ObserveContainer from "./ui/ObserveContainer"
import Overlay from "./ui/Overlay"
import CenteredText from "./ui/StatusContainer"
import { Session } from "@supabase/supabase-js"
import { useEffect, useMemo, useRef, useState } from "react"
import io from "socket.io-client"

const mobileWindowWidthThreshold = 450

const socket = io(CONFIG.SERVER_URL)

function App() {
  const [isGameLoaded, setIsGameLoaded] = useState(false)
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
  const [availableRooms, setAvailableRooms] = useState<Tables<"room">[]>([])
  const [room, setRoom] = useState<Tables<"room"> | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)

  const [mapConfig, setMapConfig] = useState<Tables<"map"> | null>(null)
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
    supabase
      .from("room")
      .select("*")
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          console.error("Error loading rooms:", error)
          return
        }
        setAvailableRooms(data)
      })
  }, [])

  useEffect(() => {
    socket.on("connect", () => {
      console.log(`Connected to server with id: ${socket.id}`)
    })

    socket.on("playerJoined", (player: PlayerData) => {
      if (player.username !== username) {
        setPlayers((prevPlayers) => new Map(prevPlayers).set(player.username, player))
      }
    })

    socket.on("existingPlayers", (players: PlayerData[]) => {
      const playersMap = new Map(players.map((player) => [player.username, player]))
      setPlayers(playersMap)
    })

    socket.on("playerDataChanged", (player: PlayerData) => {
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

    socket.on("playerLeft", (username: string) => {
      setPlayers((prevPlayers) => {
        const newPlayers = new Map(prevPlayers)
        newPlayers.delete(username)
        return newPlayers
      })
    })

    socket.on("newMessage", (message: ChatMessage) => {
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

    socket.on("overhearMessage", (message: ChatMessage) => {
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

    socket.on("listenBroadcast", (message: BroadcastMessage) => {
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

    socket.on("endConversation", (message: ChatMessage) => {
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

    socket.on("news", (news: NewsItem | NewsItem[]) => {
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
      socket.off("connect")
      socket.off("playerJoined")
      socket.off("existingPlayers")
      socket.off("playerDataChanged")
      socket.off("playerLeft")
      socket.off("newMessage")
      socket.off("overhearMessage")
      socket.off("listenBroadcast")
      socket.off("endConversation")
      socket.off("news")
    }
  }, [])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("onAuthStateChange", event, session)
      setSupabaseSession(session)
      if (session) {
        setUsername(session.user.email ? session.user.email.split("@")[0] : session.user.id)
        supabase
          .from("users")
          .select("sprite_definition")
          .then(({ data, error }) => {
            if (error) {
              console.error("Error loading user sprite definition:", error)
              return
            }
            const spriteDefinition = data[0].sprite_definition
            if (spriteDefinition) {
              setSpriteDefinition(spriteDefinition as PlayerSpriteDefinition)
            }
          })
        socket.emit("authorizeSupabase", session.access_token)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const path = window.location.pathname
    let roomNamePath = path === "/" || path === "" ? "" : path.startsWith("/") ? path.substring(1) : path

    if (availableRooms.length === 0) return

    const room = availableRooms.find((room) => room.name === roomNamePath)
    console.log("Room:", room)

    if (!room) {
      roomNamePath = CONFIG.DEFAULT_GAME
      window.location.replace(`/${roomNamePath}`)
      return
    }

    setRoom(room)

    const params = new URLSearchParams(window.location.search)
    let initialRoomId = params.get("roomid") || ""

    const tempSocket = io(CONFIG.SERVER_URL, { autoConnect: false })

    tempSocket.on("connect", () => {
      console.log(`Connected to server with id: ${tempSocket.id}`)

      tempSocket.emit("getAvailableRooms", (rooms: string[]) => {
        console.log(`Available rooms: ${rooms}`)

        if (!rooms.includes(initialRoomId)) {
          tempSocket.emit("createRoom", room.id, (roomInstanceId: string) => {
            console.log(`Created new room with id: ${roomInstanceId}`)
            const newParams = new URLSearchParams(window.location.search)
            newParams.set("roomid", roomInstanceId)
            window.history.replaceState({}, "", `${window.location.pathname}?${newParams.toString()}`)
            setRoomId(roomInstanceId)
            tempSocket.disconnect()
          })
        } else {
          setRoomId(initialRoomId)
          tempSocket.disconnect()
        }

        supabase
          .from("map")
          .select("*")
          .eq("id", room.map_id)
          .then(({ data, error }) => {
            if (error) {
              console.error("Error loading map:", error)
              return
            }
            setMapConfig(data[0])
          })
      })
    })

    tempSocket.connect()
  }, [availableRooms])

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
  }, [])

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
    return <CenteredText text="Connecting to server..." />
  }

  if (!availableRooms.length) {
    return <CenteredText text="Loading available rooms..." />
  }

  if (!roomId) {
    return <CenteredText text="Getting room id..." />
  }

  if (!mapConfig) {
    return <CenteredText text="Map config is not set yet..." />
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
