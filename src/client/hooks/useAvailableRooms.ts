import { Tables } from "../../shared/supabase-types"
import { supabase } from "../supabase"
import { useEffect, useState } from "react"

export const useAvailableRooms = (username: string | null) => {
  const [availableRooms, setAvailableRooms] = useState<Tables<"room">[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const { data, error } = await supabase.from("room").select("*").order("name")

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
  }, [username])

  return { availableRooms, isLoading, error }
}
