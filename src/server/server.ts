import { CONFIG } from "../shared/config"
import { calculateDistance, gridToWorld, isInZone, worldToGrid } from "../shared/functions"
import logger from "../shared/logger"
import {
  BroadcastMessage,
  ChatMessage,
  GridPosition,
  NewsItem,
  PlayerData,
  PlayerSpriteDefinition,
  UpdatePlayerData,
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

    let newPlayerData: PlayerData = {
      ...currentPlayerData,
      ...playerData,
    }

    let collisionDetected = false
    // // Check for collisions with other players
    // let collisionDetected = false
    // for (const [otherId, otherPlayerData] of players) {
    //   if (otherId !== playerId && checkCollision(newPlayerData, otherPlayerData)) {
    //     collisionDetected = true
    //     break
    //   }
    // }

    if (!collisionDetected) {
      // If no collision, update the player's position
      players.set(playerId, newPlayerData)
      socket.broadcast.emit("playerDataChanged", newPlayerData)
    } else {
      // If collision detected, send the current (non-updated) position back to the client
      socket.emit("positionRejected", currentPlayerData)
    }
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

  socket.on("disconnect", () => {
    const player = players.get(playerId)
    if (player) {
      const { username } = player
      players.delete(playerId)
      io.emit("playerLeft", username)
      logger.info(`User ${socket.id} disconnected. Number of players: ${players.size}`)
    }
  })
})

server.listen(CONFIG.SERVER_PORT, () => {
  logger.info(`Server is running on ${CONFIG.SERVER_URL}`)
})
