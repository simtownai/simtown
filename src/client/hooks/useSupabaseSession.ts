import { PlayerSpriteDefinition } from "../../shared/types"
import { supabase } from "../supabase"
import { Session } from "@supabase/supabase-js"
import { useEffect, useState } from "react"
import { Socket } from "socket.io-client"

interface UseSupabaseSessionReturn {
  supabaseSession: Session | null
  username: string
  spriteDefinition: PlayerSpriteDefinition
  setSpriteDefinition: (spriteDefinition: PlayerSpriteDefinition) => void
  saveSpriteDefinitionInSupabase: () => void
}

export const useSupabaseSession = (
  defaultUsername: string,
  defaultSpriteDefinition: PlayerSpriteDefinition,
  socket: Socket,
): UseSupabaseSessionReturn => {
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null)
  const [username, setUsername] = useState<string>(defaultUsername)
  const [spriteDefinition, setSpriteDefinition] = useState<PlayerSpriteDefinition>(defaultSpriteDefinition)

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
        socket?.emit("authorizeSupabase", session.access_token)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [socket])

  const saveSpriteDefinitionInSupabase = async () => {
    if (!supabaseSession) {
      throw new Error("Should not be able to save sprite definition without a session")
    }
    await supabase.from("users").update({ sprite_definition: spriteDefinition }).eq("id", supabaseSession.user.id)
  }

  return {
    supabaseSession,
    username,
    spriteDefinition,
    setSpriteDefinition,
    saveSpriteDefinitionInSupabase,
  }
}
