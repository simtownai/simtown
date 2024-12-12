import { PlayerSpriteDefinition } from "../../shared/types"
import { supabase } from "../supabase"
import { Session } from "@supabase/supabase-js"
import { useEffect, useState } from "react"

export const useSprite = (defaultSpriteDefinition: PlayerSpriteDefinition, supabaseSession: Session | null) => {
  const [spriteDefinition, setSpriteDefinition] = useState<PlayerSpriteDefinition>(defaultSpriteDefinition)

  const saveSpriteDefinitionInSupabase = async () => {
    if (!supabaseSession) {
      throw new Error("Should not be able to save sprite definition without a session")
    }
    await supabase.from("users").update({ sprite_definition: spriteDefinition }).eq("id", supabaseSession.user.id)
  }

  const loadSpriteDefinition = async () => {
    if (!supabaseSession) return

    const { data, error } = await supabase.from("users").select("sprite_definition")
    if (error) {
      console.error("Error loading user sprite definition:", error)
      return
    }
    const loadedSpriteDefinition = data[0]?.sprite_definition
    if (loadedSpriteDefinition) {
      setSpriteDefinition(loadedSpriteDefinition as PlayerSpriteDefinition)
    }
  }

  useEffect(() => {
    loadSpriteDefinition()
  }, [supabaseSession])

  return {
    spriteDefinition,
    setSpriteDefinition,
    saveSpriteDefinitionInSupabase,
    loadSpriteDefinition,
  }
}
