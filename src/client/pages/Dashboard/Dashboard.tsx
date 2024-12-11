import { PlayerSpriteDefinition } from "../../../shared/types"
import { RoomWithMap } from "../../hooks/useAvailableRooms"
import { HeaderDashboard } from "../../ui/HeaderDashboard"
import RoomItem from "../../ui/RoomItem"
import styles from "./Dashboard.module.css"
import { Session } from "@supabase/supabase-js"
import { useNavigate } from "react-router-dom"

interface DashboardProps {
  rooms: RoomWithMap[]
  username: string
  spriteDefinition: PlayerSpriteDefinition
  session: Session | null
  showAuthContainer: () => void
}

export function Dashboard({ rooms, username, spriteDefinition, session, showAuthContainer }: DashboardProps) {
  const navigate = useNavigate()

  return (
    <div className={styles.container}>
      <HeaderDashboard
        showAuthContainer={showAuthContainer}
        username={username}
        spriteDefinition={spriteDefinition}
        session={session}
      />

      <main className={styles.roomsContainer}>
        <section className={styles.introSection}>
          <p className={styles.subtitle}>Join a room and start chatting!</p>
        </section>

        <div className={styles.roomsGrid}>
          {rooms.map((room) => (
            <RoomItem key={room.id} room={room} onNavigate={(roomName) => navigate(`/${roomName}`)} />
          ))}
        </div>
      </main>
    </div>
  )
}
