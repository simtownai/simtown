import { NewsItem, PlayerSpriteDefinition } from "../../../shared/types"
import { IRefPhaserGame, PhaserGame } from "../../game/PhaserGame"
import { RoomWithMap } from "../../hooks/useAvailableRooms"
import { useLocalStorageMessages } from "../../hooks/useLocalStorageMessages"
import { useMessageState } from "../../hooks/useMessageState"
import { useOverlayState } from "../../hooks/useOverlayState"
import { usePlayerState } from "../../hooks/usePlayerState"
import { useRoomInitialization } from "../../hooks/useRoomInitialization"
import AuthContainer from "../../ui/Authorize"
import ChatsContainer from "../../ui/ChatsContainer"
import NewsContainer from "../../ui/NewsContainer"
import ObserveContainer from "../../ui/ObserveContainer"
import Overlay from "../../ui/Overlay"
import CenteredText from "../../ui/StatusContainer"
import { Session } from "@supabase/supabase-js"
import { useEffect, useMemo, useRef, useState } from "react"
import { Socket } from "socket.io-client"

interface GameRoomProps {
  socket: Socket
  userId: string
  username: string
  spriteDefinition: PlayerSpriteDefinition
  availableRooms: RoomWithMap[]
  isMobile: boolean
  supabaseSession: Session | null
}

export function GameRoom({
  socket,
  supabaseSession,
  userId,
  username,
  spriteDefinition,
  availableRooms,
  isMobile,
}: GameRoomProps) {
  const { room, roomId, mapConfig } = useRoomInitialization(availableRooms)
  const { players } = usePlayerState(socket, username)

  const {
    isChatsContainerCollapsed,
    setIsChatsContainerCollapsed,
    isChatCollapsed,
    setIsChatCollapsed,
    isExpanded,
    setIsExpanded,
    isNewsContainerCollapsed,
    setIsNewsContainerCollapsed,
    isObserveContainerCollapsed,
    setIsObserveContainerCollapsed,
    isObservedNPCCollapsed,
    setIsObservedNPCCollapsed,
    isObservedContainerExpanded,
    setIsObservedContainerExpanded,
    soundEnabled,
    setSoundEnabled,
  } = useOverlayState()

  const [isGameLoaded, setIsGameLoaded] = useState(false)
  const [chatmate, setChatmate] = useState<string | null>(null)
  const [composeValue, setComposeValue] = useState("")
  const [isMessageLoading, setIsMessageLoading] = useState(false)
  const [newsPaper, setNewsPaper] = useState<NewsItem[]>([])
  const [observedNPC, setObservedNPC] = useState<string | null>(null)

  const phaserRef = useRef<IRefPhaserGame | null>(null)

  const { messages, setMessages, markMessagesAsRead, addMessage } = useLocalStorageMessages()

  useMessageState({
    socket,
    username,
    isChatsContainerCollapsed,
    isChatCollapsed,
    chatmate,
    isNewsContainerCollapsed,
    addMessage,
  })

  const currentScene = (scene: Phaser.Scene) => {
    console.log(scene)
  }

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
