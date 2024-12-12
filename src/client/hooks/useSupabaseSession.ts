import { supabase } from "../supabase"
import { Session } from "@supabase/supabase-js"
import { useEffect, useState } from "react"
import { Socket } from "socket.io-client"

interface UseSupabaseSessionReturn {
  supabaseSession: Session | null
  username: string
}

export const useSupabaseSession = (defaultUsername: string, socket: Socket): UseSupabaseSessionReturn => {
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null)
  const [username, setUsername] = useState<string>(defaultUsername)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_, session) => {
      setSupabaseSession(session)
      if (session) {
        setUsername(session.user.email ? session.user.email.split("@")[0] : session.user.id)

        socket?.emit("authorizeSupabase", session.access_token)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [socket])

  return {
    supabaseSession,
    username,
  }
}
