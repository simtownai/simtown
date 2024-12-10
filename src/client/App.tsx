import { CONFIG } from "../shared/config"
import { createRandomSpriteDefinition } from "../shared/functions"
import { useAvailableRooms } from "./hooks/useAvailableRooms"
import { mobileWindowWidthThreshold, useMobileBreakpoint } from "./hooks/useMobileBreakpoint"
import { useSupabaseSession } from "./hooks/useSupabaseSession"
import { Dashboard } from "./pages/Dashboard/Dashboard"
import { GameRoom } from "./pages/GameRoom/GameRoom"
import Authorize from "./ui/Authorize"
import CenteredText from "./ui/StatusContainer"
import { useEffect } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import io from "socket.io-client"

const socket = io(CONFIG.SERVER_URL)

function App() {
  const defaultUsername = "Player" + Math.floor(Math.random() * 1000) + 1
  const { supabaseSession, username, spriteDefinition } = useSupabaseSession(
    defaultUsername,
    createRandomSpriteDefinition(),
    socket,
  )

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

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Dashboard rooms={availableRooms} username={username} spriteDefinition={spriteDefinition} />}
        />
        <Route
          path="/:roomName"
          element={
            <GameRoom
              socket={socket}
              username={username}
              spriteDefinition={spriteDefinition}
              availableRooms={availableRooms}
              isMobile={isMobile}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
