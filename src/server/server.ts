import { CONFIG } from "../shared/config"
import { calculateDistance, getDaysRemaining, getGameTime, isInZone } from "../shared/functions"
import logger from "../shared/logger"
import {
  AvailableGames,
  BroadcastMessage,
  ChatMessage,
  NewsItem,
  PlayerData,
  PlayerSpriteDefinition,
  UpdatePlayerData,
  VoteCandidate,
  availableVoteCandidates,
} from "../shared/types"
import { CharacterAIRoom, ElectionRoom, Room, ScavengerHuntRoom } from "./rooms"
import cors from "cors"
import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import { v4 as uuidv4 } from "uuid"

const app = express()
app.use(cors())

const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

const rooms: Map<string, Room> = new Map()

io.on("connection", (socket) => {
  const playerId = socket.id
  let currentRoom: Room | null = null

  socket.on("createRoom", (gameName: AvailableGames, callback: (roomId: string | null) => void) => {
    if (gameName === "electiontown") {
      // For shared room, return the same roomId
      let room = Array.from(rooms.values()).find((r) => r.getName() === gameName && r.getInstanceType() === "shared")
      if (!room) {
        const roomId = uuidv4() as string
        room = new ElectionRoom(roomId, gameName, "shared")
        rooms.set(roomId, room)
        room.initialize()
        initializeVotingNotifications(room)
      }
      callback(room.getId())
    } else if (gameName === "scavengerhunt") {
      // For private rooms, create a new room each time
      const roomId = uuidv4()
      const room = new ScavengerHuntRoom(roomId, gameName, "private")
      room.initialize()
      rooms.set(roomId, room)
      callback(roomId)
    } else if (gameName === "characterai") {
      // For private rooms, create a new room each time
      const roomId = uuidv4()
      const room = new CharacterAIRoom(roomId, gameName, "private")
      room.initialize()
      rooms.set(roomId, room)
      callback(roomId)
    } else {
      callback(null)
    }
  })

  socket.on("getAvailableRooms", (callback: (rooms: string[]) => void) => {
    const availableRooms = Array.from(rooms.values()).map((room) => room.getId())
    callback(availableRooms)
  })

  socket.on(
    "joinRoom",
    (roomId: string, isNPC: boolean, username: string, spriteDefinition: PlayerSpriteDefinition) => {
      const room = rooms.get(roomId)
      if (!room) {
        logger.error(
          `Room not found: ${roomId}. User ${username} failed to join. Available rooms: ${Array.from(rooms.keys())}`,
        )
        socket.emit("joinError", "Room not found")
        return
      }

      if (currentRoom) {
        leaveCurrentRoom()
      }

      currentRoom = room
      socket.join(room.getId())

      const spawnPosition = currentRoom.findValidPosition()
      let playerData: PlayerData = {
        id: playerId,
        isNPC: isNPC,
        username: username,
        spriteDefinition: spriteDefinition,
        x: spawnPosition.x,
        y: spawnPosition.y,
        animation: `${username}-idle-down`,
      }

      currentRoom.addPlayer(playerId, isNPC, username, spriteDefinition, spawnPosition)

      logger.info(`User '${username}' connected. Number of players: ${currentRoom.getPlayerCount()}`)

      socket.emit("existingPlayers", Array.from(currentRoom.getPlayers().values()))
      socket.emit("news", currentRoom.getNewsPaper())
      socket.to(roomId).emit("playerJoined", playerData)
    },
  )

  socket.on("updatePlayerData", (playerData: UpdatePlayerData) => {
    if (!currentRoom) return

    const currentPlayerData = currentRoom.getPlayer(playerId)
    if (!currentPlayerData) return

    if (playerData.npcState) {
      const newNPCState = {
        ...currentPlayerData.npcState,
        ...playerData.npcState,
      }
      playerData.npcState = newNPCState
    }

    const newPlayerData: PlayerData = {
      ...currentPlayerData,
      ...playerData,
    }

    currentRoom.updatePlayerData(playerId, newPlayerData)

    // avoiding sending npcState to other players if it didn't change
    if (!playerData.npcState) {
      const { npcState, ...playerDataToSend } = newPlayerData
      socket.to(currentRoom.getId()).emit("playerDataChanged", playerDataToSend)
    } else {
      socket.to(currentRoom.getId()).emit("playerDataChanged", newPlayerData)
    }

    // socket.broadcast.emit("playerDataChanged", newPlayerData)
  })

  socket.on("endConversation", (message: ChatMessage) => {
    if (!currentRoom) return

    logger.info(`endConversation receied from ${message.from}: ${message.message}`)
    currentRoom.getPlayers().forEach((player) => {
      if (player.username === message.to) {
        const recipientSocket = io.sockets.sockets.get(player.id)
        if (recipientSocket) {
          recipientSocket.emit("endConversation", message)
          const sender = currentRoom?.getPlayer(playerId)!
          emitOverhear(currentRoom!.getPlayers(), sender, player, message)
        } else {
          socket.emit("messageError", { error: "Recipient not found" })
        }
      }
    })
  })

  socket.on("broadcast", (message: BroadcastMessage) => {
    if (!currentRoom) return

    const broadcastPlace = message.place
    const zoneObject = currentRoom.getPlaces()!.find((obj) => obj.name === broadcastPlace)!

    currentRoom.getPlayers().forEach((player) => {
      const isInBroadcastZone = isInZone(
        player.x,
        player.y,
        zoneObject.x,
        zoneObject.y,
        zoneObject.width,
        zoneObject.height,
      )

      if (isInBroadcastZone) {
        const recipientSocket = io.sockets.sockets.get(player.id)
        if (recipientSocket) {
          recipientSocket.emit("listenBroadcast", message)
        } else {
          socket.emit("broadcastError", { error: "Recipient not found" })
        }
      }
    })
  })

  socket.on("sendMessage", (message: ChatMessage) => {
    if (!currentRoom) return
    // logger.info(`Message from ${message.from} to ${message.to}: ${message.message}`)

    if (message.to === "all") {
      io.emit("newMessage", message)
    } else {
      currentRoom.getPlayers().forEach((player) => {
        if (player.username === message.to) {
          const recipientSocket = io.sockets.sockets.get(player.id)
          if (recipientSocket) {
            recipientSocket.emit("newMessage", message)

            // Overhear logic
            const sender = currentRoom?.getPlayer(playerId)!
            emitOverhear(currentRoom?.getPlayers()!, sender, player, message)
          } else {
            socket.emit("messageError", { error: "Recipient not found" })
          }
        }

        //distance emit to overhear
      })
    }
  })

  function emitOverhear(
    players: Map<string, PlayerData>,
    sender: PlayerData,
    receiver: PlayerData,
    message: ChatMessage,
  ) {
    players.forEach((potentialOverhearPlayer) => {
      if (
        !potentialOverhearPlayer.isNPC &&
        potentialOverhearPlayer.username !== message.from &&
        potentialOverhearPlayer.username !== message.to &&
        (calculateDistance(sender.x, sender.y, potentialOverhearPlayer.x, potentialOverhearPlayer.y) <=
          CONFIG.INTERACTION_PROXIMITY_THRESHOLD ||
          calculateDistance(receiver.x, receiver.y, potentialOverhearPlayer.x, potentialOverhearPlayer.y) <=
            CONFIG.INTERACTION_PROXIMITY_THRESHOLD)
      ) {
        const potentialOverhearSocket = io.sockets.sockets.get(potentialOverhearPlayer.id)
        if (potentialOverhearSocket) {
          potentialOverhearSocket.emit("overhearMessage", message)
        }
      }
    })
  }

  socket.on("sendNews", (newsItem: NewsItem) => {
    if (!currentRoom) return
    currentRoom.addNewsItem(newsItem)
    io.to(currentRoom.getId()).emit("news", newsItem)
  })

  socket.on("vote", (candidate: VoteCandidate) => {
    if (!currentRoom) return
    const player = currentRoom.getPlayer(playerId)

    if (!player) {
      logger.error(
        `User ${playerId} not found. Available players: ${Array.from(currentRoom.getPlayers().keys())} (${currentRoom.getPlayerCount()} total)`,
      )
      return
    }

    if (availableVoteCandidates.includes(player.username as VoteCandidate)) {
      logger.warn(`User ${player.username} is not eligible to vote (voted for ${candidate})`)
      return
    }

    const currentVoteResults = currentRoom.getVoteResults()[currentRoom.getVoteResults().length - 1]
    currentVoteResults.set(player.username, candidate)

    logger.info(`User ${player.username} voted for ${candidate}`)

    const totalNPCVotes = Array.from(currentVoteResults.entries()).filter(([username]) => {
      const playerData = Array.from(currentRoom!.getPlayers().values()).find((p) => p.username === username)
      return playerData?.isNPC && !availableVoteCandidates.includes(username as VoteCandidate)
    }).length

    const totalEligibleNPCs = Array.from(currentRoom.getPlayers().values()).filter(
      (p) => p.isNPC && !availableVoteCandidates.includes(p.username as VoteCandidate),
    ).length

    if (totalNPCVotes >= totalEligibleNPCs) {
      // Create a map to store voters by candidate
      const votersByCandidate = new Map<VoteCandidate, string[]>()
      currentVoteResults.forEach((candidate, voter) => {
        if (!votersByCandidate.has(candidate)) {
          votersByCandidate.set(candidate, [])
        }
        if (!availableVoteCandidates.includes(voter as VoteCandidate)) {
          votersByCandidate.get(candidate)!.push(voter)
        }
      })

      // Calculate overall results
      const results = new Map<VoteCandidate, number>()
      currentVoteResults.forEach((candidate) => {
        const currentCount = results.get(candidate) || 0
        results.set(candidate, currentCount + 1)
      })

      const totalVotes = Array.from(results.values()).reduce((sum, count) => sum + count, 0)

      // Format the results with detailed breakdown
      let formattedResults = `📊 Election Results\n\n`

      // Sort candidates by vote count in descending order
      const sortedResults = Array.from(results.entries()).sort(([, a], [, b]) => b - a)

      sortedResults.forEach(([candidate, votes]) => {
        const percentage = ((votes / totalVotes) * 100).toFixed(1)
        const bar = "█".repeat(Math.floor((votes / totalVotes) * 20))
        const voters = votersByCandidate.get(candidate) || []

        // Sort voters alphabetically
        voters.sort((a, b) => a.localeCompare(b))

        // Format main candidate results
        formattedResults += `${candidate}\n`
        formattedResults += `${bar} ${votes} votes (${percentage}%)\n`

        // Add voter breakdown
        formattedResults += `Supported by: ${voters.join(", ")}\n`
        formattedResults += `\n\n`
      })

      formattedResults += `Total Votes Cast: ${totalVotes}\n`

      const newsItem: NewsItem = {
        date: getGameTime().toISOString(),
        message: formattedResults,
      }
      currentRoom.addNewsItem(newsItem)
      io.to(currentRoom.getId()).emit("news", newsItem)

      currentRoom.finishVoting()
    }
  })

  function leaveCurrentRoom() {
    if (!currentRoom) return

    const player = currentRoom.removePlayer(playerId)
    if (player) {
      socket.to(currentRoom.getId()).emit("playerLeft", player.username)
      logger.info(
        `User ${player.username} left room ${currentRoom.getId()}. Real players in room: ${currentRoom.getRealPlayerCount()}`,
      )
    }

    socket.leave(currentRoom.getId())

    if (!player?.isNPC && currentRoom.getRealPlayerCount() === 0) {
      currentRoom.cleanup()
      rooms.delete(currentRoom.getId())
      // io.emit("roomList", getRoomInfo())
    }
  }

  socket.on("leaveRoom", () => {
    leaveCurrentRoom()
    currentRoom = null
  })

  socket.on("disconnect", () => {
    leaveCurrentRoom()
  })
})

function sendVotingReminder(room: Room) {
  const newsItem: NewsItem = {
    date: getGameTime().toISOString(),
    message: `🗳️ Polling is open! Make your voice heard - cast your vote for the next leader! Only ${getDaysRemaining()} game days left.`,
    place: CONFIG.VOTING_PLACE_NAME,
  }
  room.addNewsItem(newsItem)
  io.to(room.getId()).emit("news", newsItem)
}

function initializeVotingNotifications(room: Room) {
  let lastNotificationGameTime = new Date(getGameTime().setDate(getGameTime().getDate() - 1))
  setInterval(() => {
    const currentGameTime = getGameTime()

    const gameHoursSinceLastNotification =
      (currentGameTime.getTime() - lastNotificationGameTime.getTime()) / 1000 / 60 / 60

    if (gameHoursSinceLastNotification >= CONFIG.VOTE_EVERY_N_HOURS) {
      sendVotingReminder(room)
      lastNotificationGameTime = currentGameTime
    }
  }, 10000)
}

server.listen(CONFIG.SERVER_PORT, () => {
  logger.info(`Server is running on ${CONFIG.SERVER_URL}`)
})
