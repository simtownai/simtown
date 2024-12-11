import { PlayerData } from "../../shared/types"
import { useEffect, useState } from "react"
import { Socket } from "socket.io-client"

export function usePlayerState(socket: Socket, username: string) {
  const [players, setPlayers] = useState<Map<string, PlayerData>>(new Map())

  useEffect(() => {
    socket.on("playerJoined", (player: PlayerData) => {
      if (player.username !== username) {
        setPlayers((prevPlayers) => new Map(prevPlayers).set(player.username, player))
      }
    })

    socket.on("existingPlayers", (players: PlayerData[]) => {
      const playersMap = new Map(players.map((player) => [player.username, player]))
      setPlayers(playersMap)
    })

    socket.on("playerDataChanged", (player: PlayerData) => {
      setPlayers((prevPlayers) => {
        const currentPlayer = prevPlayers.get(player.username)
        if (player.npcState && currentPlayer?.npcState) {
          player.npcState = {
            ...currentPlayer.npcState,
            ...player.npcState,
          }
        }
        return new Map(prevPlayers).set(player.username, {
          ...currentPlayer,
          ...player,
        })
      })
    })

    socket.on("playerLeft", (username: string) => {
      setPlayers((prevPlayers) => {
        const newPlayers = new Map(prevPlayers)
        newPlayers.delete(username)
        return newPlayers
      })
    })

    return () => {
      socket.off("playerJoined")
      socket.off("existingPlayers")
      socket.off("playerDataChanged")
      socket.off("playerLeft")
    }
  }, [socket, username])

  return { players, setPlayers }
}
