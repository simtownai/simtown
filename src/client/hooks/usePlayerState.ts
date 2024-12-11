import { ChatMessage, PlayerData } from "../../shared/types"
import { useEffect, useState } from "react"
import { Socket } from "socket.io-client"

export function usePlayerState(
  socket: Socket,
  userId: string,
  username: string,
  messages: Map<string, ChatMessage[]>,
  setMessages: React.Dispatch<React.SetStateAction<Map<string, ChatMessage[]>>>,
  initialMessages: Map<string, ChatMessage[]>,
) {
  const [players, setPlayers] = useState<Map<string, PlayerData>>(new Map())

  function handleInitializeThreadMessages(player: PlayerData) {
    const playerMessages = initialMessages.get(player.id)
    if (playerMessages) {
      setMessages((prevMessages) => {
        const idUsernameMap = new Map([
          [userId, username],
          [player.id, player.username],
        ])
        return new Map(prevMessages).set(
          player.username,
          playerMessages.map((msg) => ({ ...msg, from: idUsernameMap.get(msg.from)!, to: idUsernameMap.get(msg.to)! })),
        )
      })
    }
  }

  useEffect(() => {
    socket.on("playerJoined", (player: PlayerData) => {
      if (player.username !== username) {
        setPlayers((prevPlayers) => new Map(prevPlayers).set(player.username, player))
        handleInitializeThreadMessages(player)
      }
    })

    socket.on("existingPlayers", (players: PlayerData[]) => {
      const playersMap = new Map(players.map((player) => [player.username, player]))
      players.forEach((player) => {
        handleInitializeThreadMessages(player)
      })
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
