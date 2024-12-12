import { CONFIG } from "../shared/config"
import { createRandomSpriteDefinition } from "../shared/functions"
import { useAuthContainerState } from "./hooks/useAuth"
import { useAvailableRooms } from "./hooks/useAvailableRooms"
import { mobileWindowWidthThreshold, useMobileBreakpoint } from "./hooks/useMobileBreakpoint"
import { useSprite } from "./hooks/useSprite"
import { useSupabaseSession } from "./hooks/useSupabaseSession"
import { Dashboard } from "./pages/Dashboard/Dashboard"
import { GameRoom } from "./pages/GameRoom/GameRoom"
import Authorize from "./ui/Authorize"
import CenteredText from "./ui/StatusContainer"
import { useEffect } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import io from "socket.io-client"
import { v4 as uuidv4 } from "uuid"

const socket = io(CONFIG.SERVER_URL)

function App() {
  const defaultUsername = "Player" + Math.floor(Math.random() * 1000) + 1
  const defaultSpriteDefinition = createRandomSpriteDefinition()

  const { supabaseSession, username, initialMessages } = useSupabaseSession(defaultUsername, socket)

  const { spriteDefinition, setSpriteDefinition, saveSpriteDefinitionInSupabase } = useSprite(
    defaultSpriteDefinition,
    supabaseSession,
  )

  const { authContainerState, setAuthContainerState } = useAuthContainerState()

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

  if (!initialMessages) {
    return <CenteredText text="Loading messages..." />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              saveSpriteDefinitionInSupabase={saveSpriteDefinitionInSupabase}
              setSpriteDefinition={setSpriteDefinition}
              showAuthContainer={() => setAuthContainerState({ message: "" })}
              session={supabaseSession}
              rooms={availableRooms}
              username={username}
              spriteDefinition={spriteDefinition}
            />
          }
        />
        <Route
          path="/:roomName"
          element={
            <GameRoom
              session={supabaseSession}
              socket={socket}
              setAuthContainerState={setAuthContainerState}
              userId={supabaseSession ? supabaseSession.user.id : uuidv4()}
              username={username}
              spriteDefinition={spriteDefinition}
              availableRooms={availableRooms}
              isMobile={isMobile}
              initialMessages={initialMessages}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {CONFIG.AUTH_ENABLED && authContainerState && (
        <Authorize
          message={authContainerState.message}
          redirectTo={window.location.href}
          isMobile={isMobile}
          onClose={() => setAuthContainerState(false)}
        />
      )}
    </BrowserRouter>
  )
}

export default App
