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
      if (CONFIG.ENABLE_NPC_AUTOMATION) {
        this.isCompletedFlag = true
      }
    })

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

    this.movementController.move(deltaTime)
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
