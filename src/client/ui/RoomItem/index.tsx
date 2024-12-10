import { RoomWithMap } from "../../hooks/useAvailableRooms"
import { supabase } from "../../supabase"
import styles from "./styles.module.css"
import { useEffect, useState } from "react"

interface RoomItemProps {
  room: RoomWithMap
  onNavigate: (roomName: string) => void
}

export default function RoomItem({ room, onNavigate }: RoomItemProps) {
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMapImage() {
      if (room.map?.image) {
        const { data } = await supabase.storage.from("map_images").getPublicUrl(room.map.image)

        if (data?.publicUrl) {
          setMapImageUrl(data.publicUrl)
        }
      }
    }

    fetchMapImage()
  }, [room.map?.image])

  const formatLastUpdate = (lastUpdate: string) => {
    const date = new Date(lastUpdate)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "you joined just now"
    if (diffInMinutes < 60) return `you last joined ${diffInMinutes}min ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `you last joined ${diffInHours}h ago`

    const diffInDays = Math.floor(diffInHours / 24)
    return `you last joined ${diffInDays}d ago`
  }

  return (
    <div className={styles.roomCard} onClick={() => onNavigate(room.name)}>
      <div className={styles.roomHeader}>
        <div className={styles.roomInfo}>
          <h3>{room.name}</h3>
          {room.room_instance && room.room_instance[0] && (
            <span className={styles.lastUpdate}>{formatLastUpdate(room.room_instance[0].last_update)}</span>
          )}
        </div>
      </div>

      <div className={styles.contentSection}>
        <div className={styles.mapColumn}>
          {mapImageUrl && (
            <div className={styles.mapImageContainer}>
              <img src={mapImageUrl} alt={`Map preview for ${room.map?.name}`} className={styles.mapImage} />
              {room.map && <div className={styles.mapName}>Map: {room.map.name}</div>}
              {room.npc && room.npc.length > 0 && (
                <div className={styles.mapName}>
                  AI characters in the game: {room.npc.map((npc) => npc.name).join(", ")}
                </div>
              )}
            </div>
          )}
          <p className={styles.roomDescription}>{room.scenario || "No description available"}</p>
        </div>
      </div>
    </div>
  )
}
