import { CONFIG } from "../shared/config"
import { ChatMessage, PlayerData, UpdatePlayerData } from "../shared/types"
import { NPC } from "./client"
import { Socket } from "socket.io-client"

const threshold = 0.01
export class MovementController {
  private path: { x: number; y: number }[] = []
  private pathIndex = 0
  private speed = 50 // pixels per second
  private blockedByPlayerInfo: { username: string; startTime: number } | null = null
  private sentMoveMessage: boolean = false
  private isRecalculatingPath: boolean = false
  private isPaused: boolean = false
  private targetPosition: { x: number; y: number }
  private onMovementFailed: (() => void) | null = null
  private onMovementCompleted: (() => void) | null = null
  private lastDirection: "left" | "right" | "up" | "down" = "down"

  constructor(
    private playerData: PlayerData,
    private socket: Socket,
    private npc: NPC,
  ) {}

  setMovementFailedCallback(callback: () => void) {
    this.onMovementFailed = callback
  }

  setMovementCompletedCallback(callback: () => void) {
    this.onMovementCompleted = callback
  }

  private handleMovementCompleted() {
    if (this.onMovementCompleted) {
      this.onMovementCompleted()
      this.updateAnimationAndEmit(0, 0)

      this.onMovementCompleted = null // Reset the callback after calling it
    }
  }

  setPath(newPath: { x: number; y: number }[], targetPosition: { x: number; y: number }) {
    this.path = newPath
    this.pathIndex = 0
    this.blockedByPlayerInfo = null
    this.sentMoveMessage = false
    this.targetPosition = targetPosition
  }

  pause() {
    this.isPaused = true
    this.updateIdleState()
  }

  resume() {
    this.isPaused = false
  }

  move(deltaTime: number) {
    if (this.isPaused || this.isRecalculatingPath || this.pathIndex >= this.path.length) {
      this.updateAnimationAndEmit(0, 0)
      return
    }

    const nextTile = this.path[this.pathIndex]
    const worldPos = this.npc.gridToWorld(nextTile.x, nextTile.y)

    if (this.npc.isCellBlocked(nextTile.x, nextTile.y)) {
      this.handleBlockedPath(nextTile)
      this.updateAnimationAndEmit(0, 0)
      return
    }

    this.blockedByPlayerInfo = null
    this.sentMoveMessage = false

    const verticalOffset = (CONFIG.SPRITE_HEIGHT - CONFIG.SPRITE_COLLISION_BOX_HEIGHT) / 2
    const dx = worldPos.x - this.playerData.x
    const dy = worldPos.y + verticalOffset - (this.playerData.y + verticalOffset)

    const distance = Math.sqrt(dx * dx + dy * dy)

    const moveDistance = (this.speed * deltaTime) / 1000

    let moveX = 0
    let moveY = 0

    if (distance <= moveDistance) {
      moveX = dx
      moveY = dy
      this.playerData.x = worldPos.x
      this.playerData.y = worldPos.y
      this.pathIndex++
    } else {
      moveX = (dx / distance) * moveDistance
      moveY = (dy / distance) * moveDistance
      this.playerData.x += moveX
      this.playerData.y += moveY
    }

    this.updateAnimationAndEmit(moveX, moveY)

    if (this.pathIndex >= this.path.length) {
      this.handleMovementCompleted()
    }
  }

  private updateAnimationAndEmit(deltaX: number, deltaY: number) {
    // Increased threshold to account for tiny movements
    const isMoving = Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold

    if (isMoving) {
      const direction = this.getDirection(deltaX, deltaY)
      this.playerData.animation = `${this.playerData.username}-walk-${direction}`
      this.lastDirection = direction // Update lastDirection
    } else {
      // Use the lastDirection for idle animation
      this.playerData.animation = `${this.playerData.username}-idle-${this.lastDirection}`
    }

    this.emitUpdatePlayerData()
  }

  private getDirection(deltaX: number, deltaY: number): "left" | "right" | "up" | "down" {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal movement
      return deltaX > 0 ? "right" : "left"
    } else {
      // Vertical movement
      return deltaY > 0 ? "down" : "up"
    }
  }

  private updateIdleState() {
    // Use the lastDirection for idle animation
    this.playerData.animation = `${this.playerData.username}-idle-${this.lastDirection}`
    this.emitUpdatePlayerData()
  }

  private handleBlockedPath(nextTile: { x: number; y: number }) {
    const blockingPlayer = this.npc.getBlockingPlayer(nextTile.x, nextTile.y)

    if (blockingPlayer) {
      this.handleBlockedByPlayer(blockingPlayer)
    } else {
      this.recalculatePath()
    }

    this.updateIdleState()
  }

  private async handleBlockedByPlayer(blockingPlayer: PlayerData) {
    if (!this.blockedByPlayerInfo || this.blockedByPlayerInfo.username !== blockingPlayer.username) {
      this.blockedByPlayerInfo = { username: blockingPlayer.username, startTime: Date.now() }
      this.sentMoveMessage = false

      // Attempt to recalculate path when first blocked
      const newPath = await this.attemptPathRecalculation()
      if (newPath) {
        // If a new path is found, update the path and return
        this.setPath(newPath, this.targetPosition)
        return
      }
    }

    const elapsedTime = Date.now() - this.blockedByPlayerInfo.startTime

    if (elapsedTime < 5000) {
      this.sendMoveMessageIfNeeded(blockingPlayer)
    } else {
      this.giveUpOnTarget()
    }
  }

  private async attemptPathRecalculation(): Promise<{ x: number; y: number }[] | null> {
    console.log("Attempting to recalculate path due to player blockage")
    try {
      const newPath = await this.npc.calculatePath(this.targetPosition, true)
      if (newPath && newPath.length > 0) {
        console.log("New path found after recalculation")
        return newPath
      } else {
        console.log("No alternative path found after recalculating")
        return null
      }
    } catch (error) {
      console.error("Error recalculating path:", error)
      return null
    }
  }

  private sendMoveMessageIfNeeded(blockingPlayer: PlayerData) {
    if (!this.sentMoveMessage) {
      const replyMessage: ChatMessage = {
        from: this.playerData.username,
        to: blockingPlayer.username,
        message: "Please move, you're blocking my path.",
        date: new Date().toISOString(),
      }

      this.npc.aiBrain.memory.conversations.addChatMessage(blockingPlayer.username, replyMessage)
      this.npc.aiBrain.memory.conversations.addAIMessage(blockingPlayer.username, {
        role: "assistant",
        content: "Please move, you're blocking my path.",
      })

      this.socket.emit("sendMessage", replyMessage)
      this.sentMoveMessage = true
    }
  }

  private giveUpOnTarget() {
    this.blockedByPlayerInfo = null
    this.sentMoveMessage = false
    this.path = []
    this.pathIndex = 0

    if (this.onMovementFailed) {
      this.onMovementFailed()
      this.onMovementFailed = null
    }

    console.log("Blocked for 5 seconds, giving up on reaching the target.")
  }

  private recalculatePath() {
    if (!this.isRecalculatingPath) {
      this.isRecalculatingPath = true
      this.updateIdleState()
      this.npc
        .calculatePath(this.targetPosition, false)
        .then(this.handleRecalculatedPath.bind(this))
        .catch(this.handleRecalculationError.bind(this))
    }
  }

  private handleRecalculatedPath(newPath: { x: number; y: number }[] | null) {
    this.isRecalculatingPath = false
    if (newPath && newPath.length > 0) {
      this.setPath(newPath, this.targetPosition)
    } else {
      console.log("No alternative path found after recalculating.")
      if (this.onMovementFailed) {
        this.onMovementFailed()
        this.onMovementFailed = null
      }
    }
  }

  private handleRecalculationError(error: any) {
    this.isRecalculatingPath = false
    console.error("Error recalculating path:", error)
    if (this.onMovementFailed) {
      this.onMovementFailed()
      this.onMovementFailed = null
    }
  }

  private emitUpdatePlayerData() {
    const updateData: UpdatePlayerData = {
      x: this.playerData.x,
      y: this.playerData.y,
      animation: this.playerData.animation,
    }

    this.socket.emit("updatePlayerData", updateData)
  }
}
