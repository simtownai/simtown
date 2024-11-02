import { CONFIG } from "../../shared/config"
import logger from "../../shared/logger"
import { MoveTarget } from "../../shared/types"
import { MovementController } from "../MovementController"
import { EmitInterface } from "../SocketManager"
import { BrainDump } from "../brain/AIBrain"
import { Action } from "./Action"

export class MoveAction extends Action {
  moveTarget: MoveTarget
  isFailed: boolean = false
  lastKnownPlayerPosition: { x: number; y: number } | null = null
  pathRecalculationThreshold: number = 2
  pathRecalculationInterval: number = 500 // Minimum time between path recalculations in ms
  lastPathRecalculationTime: number = 0
  movementController: MovementController

  constructor(
    getBrainDump: () => BrainDump,
    getEmitMethods: () => EmitInterface,
    movementController: MovementController,
    moveTarget: MoveTarget,
    reason: string = "",
    shouldReflect: boolean = false,
  ) {
    super(getBrainDump, getEmitMethods, reason, shouldReflect)
    this.moveTarget = moveTarget
    this.movementController = movementController
  }

  async start() {
    logger.debug(
      `(${this.getBrainDump().playerData.username}) starting MoveAction to ${JSON.stringify(this.moveTarget)}`,
    )

    this.isStarted = true
    this.movementController.setMovementFailedCallback(() => {
      logger.error(`(${this.getBrainDump().playerData.username}) movement failed in MoveAction`)
      this.isFailed = true
    })
    this.movementController.setMovementCompletedCallback(() => {
      logger.debug(`(${this.getBrainDump().playerData.username}) received movement completed callback in MoveAction`)
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
      logger.error(`(${this.getBrainDump().playerData.username}) detected movement failure in MoveAction`)
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
