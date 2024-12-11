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
    if (room.map?.image) {
      const { data } = supabase.storage.from("map_images").getPublicUrl(room.map.image)

      if (data?.publicUrl) {
        setMapImageUrl(data.publicUrl)
      }
    }
  }, [room.map?.image])

  return (
    <div className={styles.roomCard} onClick={() => onNavigate(room.name)}>
      <div className={styles.roomHeader}>
        <div className={styles.roomInfo}>
          <h3>{room.name}</h3>
          {
            <span className={styles.lastUpdate}>
              {room.type === "shared"
                ? "This is a shared room, users can join at any time"
                : room.room_instance.length
                  ? "Continue playing"
                  : "Start playing"}
            </span>
          }
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
