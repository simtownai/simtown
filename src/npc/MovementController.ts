import { ChatMessage, PlayerData, UpdatePlayerData } from "../shared/types"
import { NPC } from "./client"
import { Socket } from "socket.io-client"

const threshold = 0.01
export class MovementController {
  private path: { x: number; y: number }[] = []
  private pathIndex = 0
  private speed = 50 // pixels per second
  private blockedByPlayerInfo: { playerId: string; startTime: number } | null = null
  private sentMoveMessage: boolean = false
  private isRecalculatingPath: boolean = false
  private isPaused: boolean = false
  private targetPosition: { x: number; y: number }
  private onMovementFailed: (() => void) | null = null
  private onMovementCompleted: (() => void) | null = null

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
      // Set deltas to zero when paused or path is completed
      this.updateAnimationAndEmit(0, 0)
      return
    }

    const nextTile = this.path[this.pathIndex]
    const worldPos = this.npc.gridToWorld(nextTile.x, nextTile.y)

    if (this.npc.isCellBlocked(nextTile.x, nextTile.y)) {
      console.log("We are blocked")
      this.handleBlockedPath(nextTile)
      // Set deltas to zero when blocked
      this.updateAnimationAndEmit(0, 0)
      return
    }

    // Reset blocked state if we're no longer blocked
    this.blockedByPlayerInfo = null
    this.sentMoveMessage = false

    // Proceed with movement
    const dx = worldPos.x - this.playerData.x
    const dy = worldPos.y - this.playerData.y

    const distance = Math.sqrt(dx * dx + dy * dy)

    const moveDistance = (this.speed * deltaTime) / 1000

    let moveX = 0
    let moveY = 0

    if (distance <= moveDistance) {
      // Snap to the exact position of the next tile
      moveX = worldPos.x - this.playerData.x
      moveY = worldPos.y - this.playerData.y
      this.playerData.x = worldPos.x
      this.playerData.y = worldPos.y
      this.pathIndex++
    } else {
      moveX = (dx / distance) * moveDistance
      moveY = (dy / distance) * moveDistance
      this.playerData.x += moveX
      this.playerData.y += moveY
    }

    // Calculate movement delta
    const deltaX = moveX
    const deltaY = moveY

    this.updateAnimationAndEmit(deltaX, deltaY)

    if (this.pathIndex >= this.path.length && this.isAtPosition(this.targetPosition)) {
      this.handleMovementCompleted()
    }
  }

  private updateAnimationAndEmit(deltaX: number, deltaY: number) {
    // Increased threshold to account for tiny movements

    const isMoving = Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold

    if (isMoving) {
      this.playerData.flipX = deltaX < 0
      this.playerData.animation = `${this.playerData.spriteType}-walk`
    } else {
      this.playerData.animation = `${this.playerData.spriteType}-idle`
      // Optionally, you can maintain the last direction faced when idle
      // this.playerData.flipX = this.playerData.flipX
    }

    this.emitUpdatePlayerData()
  }

  private updateIdleState() {
    this.playerData.animation = `${this.playerData.spriteType}-idle`
    this.playerData.flipX = false // Reset flipX when idle
    this.emitUpdatePlayerData()
  }

  private handleBlockedPath(nextTile: { x: number; y: number }) {
    const blockingPlayerId = this.npc.getBlockingPlayerId(nextTile.x, nextTile.y)

    if (blockingPlayerId) {
      this.handleBlockedByPlayer(blockingPlayerId)
    } else {
      this.recalculatePath()
    }

    this.updateIdleState()
  }

  private handleBlockedByPlayer(blockingPlayerId: string) {
    if (!this.blockedByPlayerInfo || this.blockedByPlayerInfo.playerId !== blockingPlayerId) {
      this.blockedByPlayerInfo = { playerId: blockingPlayerId, startTime: Date.now() }
      this.sentMoveMessage = false
    }

    const elapsedTime = Date.now() - this.blockedByPlayerInfo.startTime

    if (elapsedTime < 5000) {
      this.sendMoveMessageIfNeeded(blockingPlayerId)
    } else {
      this.giveUpOnTarget()
    }
  }

  private sendMoveMessageIfNeeded(blockingPlayerId: string) {
    if (!this.sentMoveMessage) {
      const replyMessage: ChatMessage = {
        from: this.playerData.id,
        to: blockingPlayerId,
        message: "Please move, you're blocking my path.",
        date: new Date().toISOString(),
      }

      this.npc.aiBrain.memory.conversations.addChatMessage(blockingPlayerId, replyMessage)
      this.npc.aiBrain.memory.conversations.addAIMessage(blockingPlayerId, {
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
      this.updateIdleState() // Ensure we're in idle state while recalculating
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
      flipX: this.playerData.flipX,
    }

    this.socket.emit("updatePlayerData", updateData)
  }

  isAtPosition(targetPosition: { x: number; y: number }): boolean {
    const dx = this.playerData.x - targetPosition.x
    const dy = this.playerData.y - targetPosition.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    console.log("distance", distance)
    return distance < 10
  }
}
