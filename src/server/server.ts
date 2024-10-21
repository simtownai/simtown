import { CONFIG } from "../shared/config"
import { ChatMessage, PlayerData, PlayerSpriteDefinition, UpdatePlayerData } from "../shared/types"
import cors from "cors"
import express from "express"
import { createServer } from "http"
import pino from "pino"
import { Server } from "socket.io"

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        }
      : undefined,
})

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

function checkCollision(player1: PlayerData, player2: PlayerData): boolean {
  const characterWidth = CONFIG.SPRITE_COLLISION_BOX_HEIGHT
  return (
    player1.x < player2.x + characterWidth &&
    player1.x + characterWidth > player2.x &&
    player1.y < player2.y + characterWidth &&
    player1.y + characterWidth > player2.y
  )
}

function findValidPosition(newPlayer: PlayerData): PlayerData {
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    let collisionFound = false

    for (const [, otherPlayer] of players) {
      if (checkCollision(newPlayer, otherPlayer)) {
        collisionFound = true
        break
      }
    }

    if (!collisionFound) {
      return newPlayer
    }

    // If collision found, try a new random position
    newPlayer.x = 300 + Math.random() * 100
    newPlayer.y = 250 + Math.random() * 50
    attempts++
  }

  // If we couldn't find a valid position after max attempts, return the last tried position
  return newPlayer
}

io.on("connection", (socket) => {
  const playerId = socket.id
  socket.on("joinGame", (username: string, spriteDefinition: PlayerSpriteDefinition) => {
    let playerData: PlayerData = {
      id: playerId,
      username: username,
      spriteDefinition: spriteDefinition,
      x: 300 + Math.random() * 100,
      y: 250 + Math.random() * 50,
      animation: `${username}-idle-down`,
    }

    // Find a valid initial position without collisions
    playerData = findValidPosition(playerData)

    players.set(playerId, playerData)

    logger.info(`User ${socket.id} connected. Number of players: ${players.size}`)

    socket.emit("existingPlayers", Array.from(players.values()))
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
        } else {
          socket.emit("messageError", { error: "Recipient not found" })
        }
      }
    })
  })

  socket.on("sendMessage", (message: ChatMessage) => {
    logger.info(`Message from ${message.from} to ${message.to}: ${message.message}`)

    if (message.to === "all") {
      io.emit("newMessage", message)
    } else {
      players.forEach((player) => {
        if (player.username === message.to) {
          const recipientSocket = io.sockets.sockets.get(player.id)
          if (recipientSocket) {
            recipientSocket.emit("newMessage", message)
          } else {
            socket.emit("messageError", { error: "Recipient not found" })
          }
        }
      })
    }
  })

  socket.on("disconnect", () => {
    players.delete(playerId)
    io.emit("playerLeft", playerId)
    logger.info(`User ${socket.id} disconnected. Number of players: ${players.size}`)
  })
})

server.listen(CONFIG.SERVER_PORT, () => {
  logger.info(`Server is running on ${CONFIG.SERVER_URL}`)
})
