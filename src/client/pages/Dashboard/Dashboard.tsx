import styles from "./Dashboard.module.css"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { RoomWithMap } from "../../hooks/useAvailableRooms"

interface DashboardProps {
  rooms: RoomWithMap[]
  username: string
  spriteDefinition: any
}

export function Dashboard({ rooms }: DashboardProps) {
  const navigate = useNavigate()
  const [expandedRooms, setExpandedRooms] = useState<Record<number, boolean>>({})

  const formatLastUpdate = (lastUpdate: string) => {
    const date = new Date(lastUpdate)
    return date.toLocaleString()
  }

  const toggleRoomExpansion = (roomId: number, event: React.MouseEvent) => {
    event.stopPropagation()
    setExpandedRooms((prev) => ({
      ...prev,
      [roomId]: !prev[roomId],
    }))
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Available Rooms</h1>
      <div className={styles.roomsGrid}>
        {rooms.map((room) => (
          <div key={room.id} className={styles.roomCard} onClick={() => navigate(`/${room.name}`)}>
            <h2>
              {room.name}
              <p className={styles.lastUpdate}>
                {room.room_instance &&
                  room.room_instance[0] &&
                  `Last active: ${formatLastUpdate(room.room_instance[0].last_update)}`}
              </p>
            </h2>

            <p>{room.scenario || "No description available"}</p>

            {room.map && (
              <>
                <button className={styles.expandButton} onClick={(e) => toggleRoomExpansion(room.id, e)}>
                  {expandedRooms[room.id] ? "Hide Map Info ▼" : "Show Map Info ▶"}
                </button>

                {expandedRooms[room.id] && (
                  <div className={styles.mapInfo}>
                    <h3>Map: {room.map.name}</h3>
                    <p>{room.map.description}</p>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
