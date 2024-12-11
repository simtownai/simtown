import { BroadcastMessage, ChatMessage, NewsItem, PlayerData, PlayerSpriteDefinition } from "../../../shared/types"
import { IRefPhaserGame, PhaserGame } from "../../game/PhaserGame"
import { RoomWithMap } from "../../hooks/useAvailableRooms"
import { useLocalStorageMessages } from "../../hooks/useLocalStorageMessages"
import { useRoomInitialization } from "../../hooks/useRoomInitialization"
import ChatsContainer from "../../ui/ChatsContainer"
import NewsContainer from "../../ui/NewsContainer"
import ObserveContainer from "../../ui/ObserveContainer"
import Overlay from "../../ui/Overlay"
import CenteredText from "../../ui/StatusContainer"
import { useEffect, useMemo, useRef, useState } from "react"
import { Socket } from "socket.io-client"

interface GameRoomProps {
  socket: Socket
  userId: string
  username: string
  spriteDefinition: PlayerSpriteDefinition
  availableRooms: RoomWithMap[]
  isMobile: boolean
}

export function GameRoom({ socket, userId, username, spriteDefinition, availableRooms, isMobile }: GameRoomProps) {
  const { room, roomId, mapConfig } = useRoomInitialization(availableRooms)

  const [isGameLoaded, setIsGameLoaded] = useState(false)
  const [chatmate, setChatmate] = useState<string | null>(null)
  const [isChatsContainerCollapsed, setIsChatsContainerCollapsed] = useState(true)
  const [isChatCollapsed, setIsChatCollapsed] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
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

  // Socket event handlers
  useEffect(() => {
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
      const newMessage = {
        ...message,
        isRead:
          !isChatsContainerCollapsedRef.current && !isChatCollapsedRef.current && chatmateRef.current === message.from,
      } as ChatMessage
      addMessage(newMessage, message.from)
    })

    socket.on("overhearMessage", (message: ChatMessage) => {
      const [first, second] = [message.from, message.to].sort()
      const key = `${first}-${second} (overheard)`
      const newMessage = {
        ...message,
        isRead: !isChatsContainerCollapsedRef.current && !isChatCollapsedRef.current && chatmateRef.current === key,
      } as ChatMessage
      addMessage(newMessage, key)
    })

    socket.on("listenBroadcast", (message: BroadcastMessage) => {
      const key = `${message.from} (broadcast)`
      const newMessage = {
        to: username,
        ...message,
        isRead: !isChatsContainerCollapsedRef.current && !isChatCollapsedRef.current && chatmateRef.current === key,
      } as ChatMessage
      addMessage(newMessage, key)
    })

    socket.on("endConversation", (message: ChatMessage) => {
      const newMessage = {
        ...message,
        isRead:
          !isChatsContainerCollapsedRef.current && !isChatCollapsedRef.current && chatmateRef.current === message.from,
      } as ChatMessage
      addMessage(newMessage, message.from)
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

  const { messages, setMessages, markMessagesAsRead, addMessage } = useLocalStorageMessages()

  useEffect(() => {
    if (chatmate) {
      markMessagesAsRead(chatmate)
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

  if (!roomId) {
    return <CenteredText text="Getting room id..." />
  }

  if (!mapConfig || !room) {
    return <CenteredText text="Loading room configuration..." />
  }

  return (
    <>
      <PhaserGame
        ref={phaserRef}
        mapConfig={mapConfig}
        userId={userId}
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
