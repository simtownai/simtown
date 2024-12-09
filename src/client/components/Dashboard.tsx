import { Tables } from "../../shared/supabase-types"
import styles from "./Dashboard.module.css"
import { useNavigate } from "react-router-dom"

interface DashboardProps {
    rooms: Tables<"room">[]
    username: string
    spriteDefinition: any // Update this type based on your sprite definition type
}

export function Dashboard({ rooms }: DashboardProps) {
    const navigate = useNavigate()

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Available Rooms</h1>
            <div className={styles.roomsGrid}>
                {rooms.map((room) => (
                    <div
                        key={room.id}
                        className={styles.roomCard}
                        onClick={() => navigate(`/${room.name}`)}
                    >
                        <h2>{room.name}</h2>
                        <p>{room.scenario || "No description available"}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
