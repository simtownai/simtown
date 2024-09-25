import { CONFIG } from "../shared/config"
import { PlayerPosition } from "../shared/types"
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

const players: Map<string, PlayerPosition> = new Map()

io.on("connection", (socket) => {
  const playerId = socket.id
  const initialPosition: PlayerPosition = {
    id: playerId,
    x: Math.random() * 400,
    y: Math.random() * 400,
  }
  players.set(playerId, initialPosition)

  console.log(`User ${socket.id} connected. Number of players: ${players.size}`)

  socket.emit("existingPlayers", Array.from(players.values()))
  socket.broadcast.emit("playerJoined", initialPosition)

  socket.on("updatePosition", (position: PlayerPosition) => {
    players.set(playerId, position)
    socket.broadcast.emit("playerMoved", position)
  })

  socket.on("disconnect", () => {
    players.delete(playerId)
    io.emit("playerLeft", playerId)
    console.log(`User ${socket.id} disconnected. Number of players: ${players.size}`)
  })
})

server.listen(CONFIG.SERVER_PORT, () => {
  console.log(`Server is running on ${CONFIG.SERVER_URL}`)
})
