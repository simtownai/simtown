import { CONFIG } from "../shared/config"
import {
  calculateDistance,
  getDaysRemaining,
  getGameTime,
  gridToWorld,
  isInZone,
  worldToGrid,
} from "../shared/functions"
import logger from "../shared/logger"
import {
  BroadcastMessage,
  ChatMessage,
  GridPosition,
  NewsItem,
  PlayerData,
  PlayerSpriteDefinition,
  UpdatePlayerData,
  VoteCandidate,
  availableVoteCandidates,
} from "../shared/types"
import cors from "cors"
import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"

const app = express()
app.use(cors())

const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

const players: Map<string, PlayerData> = new Map()
const newsPaper: NewsItem[] = []

const places = CONFIG.MAP_DATA.layers.find((layer) => layer.name === CONFIG.PLACES_LAYER_NAME)!.objects!

const spawnArea = places.find((obj) => obj.name === CONFIG.SPAWN_PLACE_NAME)!

const voteResults: Map<string, VoteCandidate>[] = [new Map()]

function isCellBlocked(cell: GridPosition): boolean {
  for (const player of players.values()) {
    const playerGridPos = worldToGrid(player.x, player.y)
    if (playerGridPos.gridX === cell.gridX && playerGridPos.gridY === cell.gridY) {
      return true
    }
  }
  return false
}

function findValidPosition(): { x: number; y: number } {
  const availablePositions: GridPosition[] = []

  const minGridPos = worldToGrid(spawnArea.x + 1, spawnArea.y + 1)
  const maxGridPos = worldToGrid(spawnArea.x + spawnArea.width, spawnArea.y + spawnArea.height)

  for (let y = minGridPos.gridY; y <= maxGridPos.gridY; y++) {
    for (let x = minGridPos.gridX; x <= maxGridPos.gridX; x++) {
      const gridPos: GridPosition = { gridX: x, gridY: y }

      if (!isCellBlocked(gridPos)) {
        availablePositions.push(gridPos)
      }
    }
  }

  const randomGridPos = availablePositions[Math.floor(Math.random() * availablePositions.length)]
  return gridToWorld(randomGridPos)
}

io.on("connection", (socket) => {
  const playerId = socket.id
  socket.on("joinGame", (isNPC: boolean, username: string, spriteDefinition: PlayerSpriteDefinition) => {
    const spawnPosition = findValidPosition()
    let playerData: PlayerData = {
      id: playerId,
      isNPC: isNPC,
      username: username,
      spriteDefinition: spriteDefinition,
      x: spawnPosition.x,
      y: spawnPosition.y,
      animation: `${username}-idle-down`,
    }

    players.set(playerId, playerData)

    logger.info(`User '${username}' connected. Number of players: ${players.size}`)

    socket.emit("existingPlayers", Array.from(players.values()))
    socket.emit("news", newsPaper)
    socket.broadcast.emit("playerJoined", playerData)
  })

  socket.on("updatePlayerData", (playerData: UpdatePlayerData) => {
    const currentPlayerData = players.get(playerId)
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

    players.set(playerId, newPlayerData)

    // avoiding sending npcState to other players if it didn't change
    if (!playerData.npcState) {
      const { npcState, ...playerDataToSend } = newPlayerData
      socket.broadcast.emit("playerDataChanged", playerDataToSend)
    } else {
      socket.broadcast.emit("playerDataChanged", newPlayerData)
    }

    // socket.broadcast.emit("playerDataChanged", newPlayerData)
  })

  socket.on("endConversation", (message: ChatMessage) => {
    logger.info(`endConversation receied from ${message.from}: ${message.message}`)
    players.forEach((player) => {
      if (player.username === message.to) {
        const recipientSocket = io.sockets.sockets.get(player.id)
        if (recipientSocket) {
          recipientSocket.emit("endConversation", message)
          const sender = players.get(playerId)!
          emitOverhear(players, sender, player, message)
        } else {
          socket.emit("messageError", { error: "Recipient not found" })
        }
      }
    })
  })

  socket.on("broadcast", (message: BroadcastMessage) => {
    const broadcastPlace = message.place
    const zoneObject = places.find((obj) => obj.name === broadcastPlace)!

    players.forEach((player) => {
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
    // logger.info(`Message from ${message.from} to ${message.to}: ${message.message}`)
    if (message.to === "all") {
      io.emit("newMessage", message)
    } else {
      players.forEach((player) => {
        if (player.username === message.to) {
          const recipientSocket = io.sockets.sockets.get(player.id)
          if (recipientSocket) {
            recipientSocket.emit("newMessage", message)

            // Overhear logic
            const sender = players.get(playerId)!
            emitOverhear(players, sender, player, message)
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
    newsPaper.push(newsItem)
    io.emit("news", newsItem)
  })

  socket.on("vote", (candidate: VoteCandidate) => {
    const player = players.get(playerId)!

    if (!player) {
      logger.error(
        `User ${playerId} not found. Available players: ${Array.from(players.keys())} (${players.size} total)`,
      )
      return
    }

    if (availableVoteCandidates.includes(player.username as VoteCandidate)) {
      logger.warn(`User ${player.username} is not eligible to vote (voted for ${candidate})`)
      return
    }

    const currentVoteResults = voteResults[voteResults.length - 1]
    currentVoteResults.set(player.username, candidate)

    logger.info(`User ${player.username} voted for ${candidate}`)

    const totalNPCVotes = Array.from(currentVoteResults.entries()).filter(([username]) => {
      const playerData = Array.from(players.values()).find((p) => p.username === username)
      return playerData?.isNPC && !availableVoteCandidates.includes(username as VoteCandidate)
    }).length

    const totalEligibleNPCs = Array.from(players.values()).filter(
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
      newsPaper.push(newsItem)
      io.emit("news", newsItem)

      voteResults.push(new Map())
    }
  })

  socket.on("disconnect", () => {
    const player = players.get(playerId)
    if (player) {
      const { username } = player
      players.delete(playerId)
      io.emit("playerLeft", username)
      logger.info(`User ${username} disconnected. Number of players: ${players.size}`)
    }
  })
})

function sendVotingReminder() {
  const newsItem: NewsItem = {
    date: getGameTime().toISOString(),
    message: `🗳️ Polling is open! Make your voice heard - cast your vote for the next leader! Only ${getDaysRemaining()} game days left.`,
    place: CONFIG.VOTING_PLACE_NAME,
  }
  newsPaper.push(newsItem)
  io.emit("news", newsItem)
}

function initializeVotingNotifications() {
  let lastNotificationGameTime = new Date(getGameTime().setDate(getGameTime().getDate() - 1))
  setInterval(() => {
    const currentGameTime = getGameTime()

    const gameHoursSinceLastNotification =
      (currentGameTime.getTime() - lastNotificationGameTime.getTime()) / 1000 / 60 / 60

    if (gameHoursSinceLastNotification >= CONFIG.VOTE_EVERY_N_HOURS) {
      sendVotingReminder()
      lastNotificationGameTime = currentGameTime
    }
  }, 10000)
}

server.listen(CONFIG.SERVER_PORT, () => {
  logger.info(`Server is running on ${CONFIG.SERVER_URL}`)
  initializeVotingNotifications()
})
