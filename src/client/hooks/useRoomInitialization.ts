import { CONFIG } from "../../shared/config"
import { Tables } from "../../shared/supabase-types"
import { RoomWithMap } from "./useAvailableRooms"
import { useEffect, useState } from "react"
import io from "socket.io-client"

export function useRoomInitialization(availableRooms: RoomWithMap[]) {
  const [room, setRoom] = useState<Tables<"room"> | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [mapConfig, setMapConfig] = useState<Tables<"map"> | null>(null)

  useEffect(() => {
    const path = window.location.pathname
    if (path === "/" || path === "") return

    let roomNamePath = path.startsWith("/") ? path.substring(1) : path
    roomNamePath = decodeURIComponent(roomNamePath)

    if (availableRooms.length === 0) return

    const room = availableRooms.find((room) => room.name === roomNamePath)

    if (!room) {
      window.location.replace("/")
      return
    }

    setRoom(room)
    setMapConfig(room.map)

    const params = new URLSearchParams(window.location.search)

    const initialRoomId = params.get("roomid") || ""
    if (room.room_instance.find((room_instance) => room_instance.id === initialRoomId)) {
      setRoomId(initialRoomId)
    } else if (room.room_instance.length > 0) {
      const roomInstanceId = room.room_instance.sort((a, b) => (a.last_update > b.last_update ? -1 : 1))[0].id
      const newParams = new URLSearchParams(window.location.search)
      newParams.set("roomid", roomInstanceId)
      window.history.replaceState({}, "", `${window.location.pathname}?${newParams.toString()}`)
      setRoomId(roomInstanceId)
    } else {
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
        })
      })

      tempSocket.connect()
    }
  }, [availableRooms])

  return { room, roomId, mapConfig }
}
