// In MoveAction.ts
import { MoveTarget } from "../../shared/types"
import { NPC } from "../client"
import { Action } from "./Action"

export class MoveAction extends Action {
  moveTarget: MoveTarget
  isStarted: boolean = false
  isFailed: boolean = false
  lastKnownPlayerPosition: { x: number; y: number } | null = null
  pathRecalculationThreshold: number = 32 // Distance threshold for path recalculation
  pathRecalculationInterval: number = 500 // Minimum time between path recalculations in ms
  lastPathRecalculationTime: number = 0

  constructor(npc: NPC, moveTarget: MoveTarget) {
    super(npc)
    this.moveTarget = moveTarget
  }

  async start() {
    console.log("MoveAction start", this.moveTarget)

    this.isStarted = true
    this.npc.movementController.setMovementFailedCallback(() => {
      console.log("Movement failed callback received in MoveAction")
      this.isFailed = true
    })
    this.npc.movementController.setMovementCompletedCallback(() => {
      console.log("Movement completed callback received in MoveAction")
      // We'll handle completion in the update method
    })

    if (this.moveTarget.targetType === "person") {
      const player = this.npc.otherPlayers.get(this.moveTarget.name)
      if (player) {
        this.lastKnownPlayerPosition = { x: player.x, y: player.y }
      } else {
        console.log("Player not found at start.")
        this.isCompletedFlag = true
        return
      }
    }

    await this.npc.move_to(this.moveTarget)
    this.npc.movementController.resume()
  }

  async update(deltaTime: number) {
    if (this.isInterrupted || !this.isStarted) return

    if (this.isFailed) {
      console.log("MoveAction detected movement failure.")
      this.isCompletedFlag = true
      return
    }

    if (this.moveTarget.targetType === "person") {
      const player = this.npc.otherPlayers.get(this.moveTarget.name)
      if (!player) {
        console.log("Player not found, action failed.")
        this.isCompletedFlag = true
        return
      }

      const dx = player.x - this.npc.playerData.x
      const dy = player.y - this.npc.playerData.y

      const isAdjacent =
        (Math.abs(dx) <= 32 && Math.abs(dy) <= this.npc.tileSize / 2 && dx !== 0) ||
        (Math.abs(dy) <= 32 && Math.abs(dx) <= this.npc.tileSize / 2 && dy !== 0)

      console.log("isAdjacent", isAdjacent)

      if (isAdjacent) {
        // Face the person
        const direction = this.getFacingDirection(dx, dy)
        this.npc.playerData.animation = `${this.npc.playerData.username}-idle-${direction}`
        this.npc.movementController.emitUpdatePlayerData()

        this.isCompletedFlag = true
        return
      } else {
        const currentTime = Date.now()

        // Check if movement is completed
        if (
          this.npc.movementController.movementCompleted &&
          currentTime - this.lastPathRecalculationTime > this.pathRecalculationInterval
        ) {
          console.log("Movement completed but not adjacent. Recalculating path...")
          this.lastKnownPlayerPosition = { x: player.x, y: player.y }
          this.lastPathRecalculationTime = currentTime
          await this.npc.move_to(this.moveTarget)
          this.npc.movementController.movementCompleted = false // Reset the flag
        } else if (currentTime - this.lastPathRecalculationTime > this.pathRecalculationInterval) {
          const lastPos = this.lastKnownPlayerPosition!
          const distanceMoved = Math.hypot(player.x - lastPos.x, player.y - lastPos.y)

          if (distanceMoved > this.pathRecalculationThreshold) {
            this.lastKnownPlayerPosition = { x: player.x, y: player.y }
            this.lastPathRecalculationTime = currentTime
            await this.npc.move_to(this.moveTarget)
          }
        }
      }
    }

    this.npc.movementController.move(deltaTime)
  }

  private getFacingDirection(dx: number, dy: number): "left" | "right" | "up" | "down" {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? "right" : "left"
    } else {
      return dy > 0 ? "down" : "up"
    }
  }

  interrupt(): void {
    super.interrupt()
    this.npc.movementController.pause()
  }

  resume(): void {
    super.resume()
    this.npc.move_to(this.moveTarget)
    this.npc.movementController.resume()
  }
}
