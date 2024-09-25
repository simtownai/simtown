import { CONFIG } from "../shared/config"
import { PlayerPosition } from "../shared/types"
import "./style.css"
import { io } from "socket.io-client"

const socket = io(CONFIG.SERVER_URL)

const canvas = document.createElement("canvas")
canvas.width = 400
canvas.height = 400
document.body.appendChild(canvas)

const ctx = canvas.getContext("2d")!

const players: Map<string, PlayerPosition> = new Map()

socket.on("connect", () => {
  if (socket.id === undefined) {
    console.error("Socket ID is undefined on connect")
    return
  }

  socket.on("existingPlayers", (positions: PlayerPosition[]) => {
    positions.forEach((position) => {
      players.set(position.id, position)
    })
    drawPlayers()
  })

  socket.on("playerJoined", (position: PlayerPosition) => {
    players.set(position.id, position)
    drawPlayers()
  })

  socket.on("playerMoved", (position: PlayerPosition) => {
    players.set(position.id, position)
    drawPlayers()
  })

  socket.on("playerLeft", (playerId: string) => {
    players.delete(playerId)
    console.log("User disconnected")
    drawPlayers()
  })

  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const position: PlayerPosition = {
      id: socket.id,
      x,
      y,
    }

    socket.emit("updatePosition", position)
    players.set(socket.id, position)
    drawPlayers()
  })
})

function drawPlayers() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  players.forEach((player) => {
    ctx.beginPath()
    ctx.arc(player.x, player.y, 10, 0, 2 * Math.PI)
    ctx.fillStyle = player.id === socket.id ? "blue" : "red"
    ctx.fill()
    ctx.closePath()
  })
}
