import { useEffect, useState } from "react"
import { CONFIG } from "../shared/config"
import { createRandomSpriteDefinition } from "../shared/functions"
import { Tables } from "../shared/supabase-types"
import { supabase } from "./supabase"
import Authorize from "./ui/Authorize"
import CenteredText from "./ui/StatusContainer"
import io from "socket.io-client"
import { useSupabaseSession } from "./hooks/useSupabaseSession"
import { mobileWindowWidthThreshold, useMobileBreakpoint } from "./hooks/useMobileBreakpoint"
import { useAvailableRooms } from "./hooks/useAvailableRooms"
import { GameRoom } from "./components/GameRoom"
import { Dashboard } from "./components/Dashboard"

const socket = io(CONFIG.SERVER_URL)

function App() {
  const [room, setRoom] = useState<Tables<"room"> | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [mapConfig, setMapConfig] = useState<Tables<"map"> | null>(null)

  const defaultUsername = "Player" + Math.floor(Math.random() * 1000) + 1
  const {
    supabaseSession,
    username,
    spriteDefinition,
  } = useSupabaseSession(defaultUsername, createRandomSpriteDefinition(), socket)

  const { availableRooms, isLoading: isLoadingRooms, error: roomsError } = useAvailableRooms()
  const isMobile = useMobileBreakpoint(mobileWindowWidthThreshold)

  useEffect(() => {
    socket.on("connect", () => {
      console.log(`Connected to server with id: ${socket.id}`)
    })

    return () => {
      socket.off("connect")
    }
  }, [])

  useEffect(() => {
    const path = window.location.pathname
    if (path === "/" || path === "") return

    let roomNamePath = path.startsWith("/") ? path.substring(1) : path

    if (availableRooms.length === 0) return

    const room = availableRooms.find((room) => room.name === roomNamePath)

    if (!room) {
      window.location.replace("/")
      return
    }

    setRoom(room)

    const params = new URLSearchParams(window.location.search)
    let initialRoomId = params.get("roomid") || ""

    const tempSocket = io(CONFIG.SERVER_URL, { autoConnect: false })

    tempSocket.on("connect", () => {
      tempSocket.emit("getAvailableRooms", (rooms: string[]) => {
        if (!rooms.includes(initialRoomId)) {
          tempSocket.emit("createRoom", room.id, (roomInstanceId: string) => {
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

  if (CONFIG.AUTH_ENABLED && !supabaseSession) {
    return <Authorize redirectTo={window.location.href} />
  }

  if (!socket) {
    return <CenteredText text="Connecting to server..." />
  }

  if (isLoadingRooms) {
    return <CenteredText text="Loading available rooms..." />
  }

  if (roomsError) {
    return <CenteredText text={`Error loading rooms: ${roomsError.message}`} />
  }

  if (!availableRooms.length) {
    return <CenteredText text="No rooms available" />
  }

  if (window.location.pathname === "/" || window.location.pathname === "") {
    return (
      <Dashboard
        rooms={availableRooms}
        username={username}
        spriteDefinition={spriteDefinition}
      />
    )
  }

  if (!roomId) {
    return <CenteredText text="Getting room id..." />
  }

  if (!mapConfig || !room) {
    return <CenteredText text="Loading room configuration..." />
  }

  return (
    <GameRoom
      socket={socket}
      username={username}
      spriteDefinition={spriteDefinition}
      room={room}
      roomId={roomId}
      mapConfig={mapConfig}
      isMobile={isMobile}
    />
  )
}

export default App
