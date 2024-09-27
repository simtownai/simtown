import { CONFIG } from "../shared/config"
import { PlayerData } from "../shared/types"
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

function getNextAvailableSprite(): number {
  if (availableSprites.length === 0) {
    // If all sprites are taken, reset the list
    availableSprites.push(...[0, 1, 2, 3, 4, 5, 6, 7])
  }
  const randomIndex = Math.floor(Math.random() * availableSprites.length)
  return availableSprites.splice(randomIndex, 1)[0]
}

io.on("connection", (socket) => {
  const playerId = socket.id
  const spriteIndex = getNextAvailableSprite()
  const initialPosition: PlayerData = {
    id: playerId,
    x: Math.random() * 800,
    y: Math.random() * 600,
    animation: `idle-${spriteIndex}`, // Set initial animation
    spriteIndex: spriteIndex,
  }
  players.set(playerId, initialPosition)

  console.log(`User ${socket.id} connected. Assigned sprite: ${spriteIndex}. Number of players: ${players.size}`)

  socket.emit("existingPlayers", Array.from(players.values()))
  socket.broadcast.emit("playerJoined", initialPosition)

  socket.on("updatePosition", (data: PlayerData) => {
    const updatedData = { ...data, spriteIndex: players.get(playerId)?.spriteIndex }
    players.set(playerId, updatedData)
    socket.broadcast.emit("playerMoved", updatedData)
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
