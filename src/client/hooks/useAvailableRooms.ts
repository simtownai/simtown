import { Json, Tables } from "../../shared/supabase-types"
import { supabase } from "../supabase"
import { useEffect, useState } from "react"

export type RoomWithMap = Tables<"room"> & {
  map: {
    name: string
    description: string
    image: string
  } | null
  room_instance: {
    last_update: string
  }[]
  npc: {
    id: number
    name: string
    sprite_definition: Json
  }[]
}

export const useAvailableRooms = () => {
  const [availableRooms, setAvailableRooms] = useState<RoomWithMap[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const { data, error } = await supabase
          .from("room")
          .select(
            `
            *,
            map(name, description, image),
            room_instance(last_update),
            npc(id, name, sprite_definition)
          `,
          )
          .order("name", { ascending: false })

        if (error) {
          throw new Error(error.message)
        }

        setAvailableRooms(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load rooms"))
      } finally {
        setIsLoading(false)
      }
    }

    loadRooms()
  }, [])

  return { availableRooms, isLoading, error }
}
