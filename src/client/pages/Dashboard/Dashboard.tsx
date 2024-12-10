import { RoomWithMap } from "../../hooks/useAvailableRooms"
import RoomItem from "../../ui/RoomItem"
import { SpritePreviewGame } from "../../ui/SpritePreview/SpritePreviewGame"
import styles from "./Dashboard.module.css"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

interface DashboardProps {
  rooms: RoomWithMap[]
  username: string
  spriteDefinition: any
}

export function Dashboard({ rooms, username, spriteDefinition }: DashboardProps) {
  const navigate = useNavigate()
  const [expandedRooms, setExpandedRooms] = useState<Record<number, boolean>>({})

  const toggleRoomExpansion = (roomId: number, event: React.MouseEvent) => {
    event.stopPropagation()
    setExpandedRooms((prev) => ({
      ...prev,
      [roomId]: !prev[roomId],
    }))
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.welcomeSection}>
          <span className={styles.welcomeText}>Welcome back:</span>
          <span className={styles.username}>{username}</span>
        </div>
        <div className={styles.spriteSection}>
          <SpritePreviewGame username={username} spriteDefinition={spriteDefinition} width={82} height={82} />
        </div>
      </header>

      <main className={styles.roomsContainer}>
        <section className={styles.introSection}>
          <h2>What do you want to do?</h2>
          <p className={styles.subtitle}>Join a room and start chatting!</p>
        </section>

        <div className={styles.roomsGrid}>
          {rooms.map((room) => (
            <RoomItem
              key={room.id}
              room={room}
              onNavigate={(roomName) => navigate(`/${roomName}`)}
              expanded={expandedRooms[room.id]}
              onToggleExpand={toggleRoomExpansion}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
