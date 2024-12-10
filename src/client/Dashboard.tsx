import { Tables } from "../shared/supabase-types"
import styles from "./Dashboard.module.css"
import { useNavigate } from "react-router-dom"
import { useState } from "react"

interface DashboardProps {
    rooms: (Tables<"room"> & {
        id: string;
        map: {
            name: string
            description: string
        } | null
    })[]
    username: string
    spriteDefinition: any
}

export function Dashboard({ rooms }: DashboardProps) {
    const navigate = useNavigate()
    const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({})

    const toggleRoomExpansion = (roomId: string, event: React.MouseEvent) => {
        event.stopPropagation()
        setExpandedRooms(prev => ({
            ...prev,
            [roomId]: !prev[roomId]
        }))
    }

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

                        {room.map && (
                            <>
                                <button
                                    className={styles.expandButton}
                                    onClick={(e) => toggleRoomExpansion(room.id, e)}
                                >
                                    {expandedRooms[room.id] ? 'Hide Map Info ▼' : 'Show Map Info ▶'}
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
