import { CONFIG } from "../../shared/config"
import { MoveTarget, PlayerData } from "../../shared/types"
import { MovementController } from "../MovementController"
import { BrainDump } from "../brain/AIBrain"
import { Action } from "./Action"
import { Socket } from "socket.io-client"

export class MoveAction extends Action {
  moveTarget: MoveTarget
  isFailed: boolean = false
  lastKnownPlayerPosition: { x: number; y: number } | null = null
  pathRecalculationThreshold: number = 2
  pathRecalculationInterval: number = 500 // Minimum time between path recalculations in ms
  lastPathRecalculationTime: number = 0
  movementController: MovementController
  setAndEmitPlayerData: (playerData: PlayerData) => void

  constructor(
    getBrainDump: () => BrainDump,
    socket: Socket,
    movementController: MovementController,
    setAndEmitPlayerData: (playerData: PlayerData) => void,
    moveTarget: MoveTarget,
    reason: string = "",
  ) {
    super(getBrainDump, socket, reason)
    this.moveTarget = moveTarget
    this.movementController = movementController
    this.setAndEmitPlayerData = setAndEmitPlayerData
  }

  async start() {
    console.log("MoveAction start", this.moveTarget)

    this.isStarted = true
    this.movementController.setMovementFailedCallback(() => {
      console.log("Movement failed callback received in MoveAction")
      this.isFailed = true
    })
    this.movementController.setMovementCompletedCallback(() => {
      console.log("Movement completed callback received in MoveAction")
      if (CONFIG.ENABLE_NPC_AUTOMATION && this.moveTarget.targetType !== "person") {
        this.isCompletedFlag = true
      }
    })

    if (this.moveTarget.targetType === "person") {
      const player = this.getBrainDump().otherPlayers.get(this.moveTarget.name)
      if (player) {
        this.lastKnownPlayerPosition = { x: player.x, y: player.y }
      } else {
        console.log("Player not found at start.")
        this.isCompletedFlag = true
        return
      }
    }

    await this.movementController.initiateMovement(this.moveTarget)
    this.movementController.resume()
  }

  async update(deltaTime: number) {
    if (this.isInterrupted || !this.isStarted) return

    if (this.isFailed) {
      console.log("MoveAction detected movement failure.")
      this.isCompletedFlag = true
      return
    }

    if (this.moveTarget.targetType === "person") {
      const player = this.getBrainDump().otherPlayers.get(this.moveTarget.name)
      if (!player) {
        console.log("Player not found, action failed.")
        this.isCompletedFlag = true
        return
      }

      const currentTime = Date.now()

      if (
        this.movementController.movementCompleted &&
        currentTime - this.lastPathRecalculationTime > this.pathRecalculationInterval
      ) {
        const dx = player.x - this.getBrainDump().playerData.x
        const dy = player.y - this.getBrainDump().playerData.y
        const direction = this.getFacingDirection(dx, dy)

        const newPlayerData = {
          ...this.getBrainDump().playerData,
          animation: `${this.getBrainDump().playerData.username}-idle-${direction}`,
        }
        this.setAndEmitPlayerData(newPlayerData)

        this.isCompletedFlag = true
        // return
        // }
        // console.log("Movement completed but not adjacent. Recalculating path...")
        // this.lastKnownPlayerPosition = { x: player.x, y: player.y }
        // this.lastPathRecalculationTime = currentTime
        // await this.npc.initiateMovement(this.moveTarget)
        // this.npc.movementController.movementCompleted = false // Reset the flag
      } else if (currentTime - this.lastPathRecalculationTime > this.pathRecalculationInterval) {
        const lastPos = this.lastKnownPlayerPosition!
        const distanceMoved = Math.hypot(player.x - lastPos.x, player.y - lastPos.y)

        if (distanceMoved > this.pathRecalculationThreshold) {
          console.log("Player moved significantly, recalculating path.")
          this.lastKnownPlayerPosition = { x: player.x, y: player.y }
          this.lastPathRecalculationTime = currentTime
          await this.movementController.initiateMovement(this.moveTarget)
        }
      }
    }

    this.movementController.move(deltaTime)
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
    this.movementController.pause()
  }

  resume(): void {
    super.resume()
    this.movementController.initiateMovement(this.moveTarget)
    this.movementController.resume()
  }
}
