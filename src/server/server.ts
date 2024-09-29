import { CONFIG } from "../shared/config"
import { PlayerData, UpdatePlayerData } from "../shared/types"
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
const availableSprites: number[] = [0, 1, 2, 3, 4, 5, 6, 7]

// Constants for collision detection

function getNextAvailableSprite(): number {
  if (availableSprites.length === 0) {
    availableSprites.push(...[0, 1, 2, 3, 4, 5, 6, 7])
  }
  const randomIndex = Math.floor(Math.random() * availableSprites.length)
  return availableSprites.splice(randomIndex, 1)[0]
}

function checkCollision(player1: PlayerData, player2: PlayerData): boolean {
  return (
    player1.x < player2.x + CONFIG.CHARACTER_WIDTH &&
    player1.x + CONFIG.CHARACTER_WIDTH > player2.x &&
    player1.y < player2.y + CONFIG.CHARACTER_WIDTH &&
    player1.y + CONFIG.CHARACTER_WIDTH > player2.y
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
    newPlayer.x = Math.random() * 800
    newPlayer.y = Math.random() * 600
    attempts++
  }

  // If we couldn't find a valid position after max attempts, return the last tried position
  return newPlayer
}

io.on("connection", (socket) => {
  const playerId = socket.id
  const spriteIndex = getNextAvailableSprite()
  let initialPosition: PlayerData = {
    id: playerId,
    x: Math.random() * 800,
    y: Math.random() * 600,
    animation: `idle-${spriteIndex}`,
    spriteIndex: spriteIndex,
  }

  // Find a valid initial position without collisions
  initialPosition = findValidPosition(initialPosition)

  players.set(playerId, initialPosition)

  console.log(`User ${socket.id} connected. Assigned sprite: ${spriteIndex}. Number of players: ${players.size}`)

  socket.emit("existingPlayers", Array.from(players.values()))
  socket.broadcast.emit("playerJoined", initialPosition)

  socket.on("updatePlayerData", (playerData: UpdatePlayerData) => {
    console.log("updatePlayerData", playerData)
    const currentPlayerData = players.get(playerId)
    if (!currentPlayerData) return

    let newPlayerData = { ...currentPlayerData, ...playerData }

    // Check for collisions with other players
    let collisionDetected = false
    for (const [otherId, otherPlayerData] of players) {
      if (otherId !== playerId && checkCollision(newPlayerData, otherPlayerData)) {
        collisionDetected = true
        break
      }
    }

    if (!collisionDetected) {
      // If no collision, update the player's position
      players.set(playerId, newPlayerData)
      socket.broadcast.emit("playerDataChanged", newPlayerData)
    } else {
      // If collision detected, send the current (non-updated) position back to the client
      socket.emit("positionRejected", currentPlayerData)
    }
  })

  socket.on("disconnect", () => {
    const player = players.get(playerId)
    if (player) {
      availableSprites.push(player.spriteIndex)
    }
    players.delete(playerId)
    io.emit("playerLeft", playerId)
    console.log(`User ${socket.id} disconnected. Number of players: ${players.size}`)
  })
})

server.listen(CONFIG.SERVER_PORT, () => {
  console.log(`Server is running on ${CONFIG.SERVER_URL}`)
})
