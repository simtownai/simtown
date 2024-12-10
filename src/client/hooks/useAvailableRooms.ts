import { Tables } from "../../shared/supabase-types"
import { supabase } from "../supabase"
import { useEffect, useState } from "react"

type RoomWithMap = Tables<"room"> & {
  map: {
    name: string
    description: string
  } | null
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
            map(name, description)
          `,
          )
          .order("name")

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
