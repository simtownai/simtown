import { RoomWithMap } from "../../hooks/useAvailableRooms"
import styles from "./styles.module.css"

interface RoomItemProps {
    room: RoomWithMap
    onNavigate: (roomName: string) => void
    expanded: boolean
    onToggleExpand: (roomId: number, event: React.MouseEvent) => void
}

export default function RoomItem({ room, onNavigate, expanded, onToggleExpand }: RoomItemProps) {
    const formatLastUpdate = (lastUpdate: string) => {
        const date = new Date(lastUpdate)
        return date.toLocaleString()
    }

    return (
        <div className={styles.roomCard} onClick={() => onNavigate(room.name)}>
            <div className={styles.roomHeader}>
                <h3>{room.name}</h3>
                {room.room_instance && room.room_instance[0] && (
                    <span className={styles.lastUpdate}>
                        {formatLastUpdate(room.room_instance[0].last_update)}
                    </span>
                )}
            </div>
            <p className={styles.roomDescription}>{room.scenario || "No description available"}</p>

            {room.map && (
                <div className={styles.mapSection}>
                    <a className={styles.expandButton} onClick={(e) => onToggleExpand(room.id, e)}>
                        {expanded ? "Hide Details ▼" : "Show Details ▶"}
                    </a>

                    {expanded && (
                        <div className={styles.mapInfo}>
                            <h4>Map: {room.map.name}</h4>
                            <p>{room.map.description}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
} 