import { MoveTarget } from "../Plan"
import { NPC } from "../client"
import { Action } from "./Action"

export class MoveAction extends Action {
  moveTarget: MoveTarget
  isStarted: boolean = false
  isFailed: boolean = false // New flag for movement failure

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
      this.isCompletedFlag = true
    })

    this.npc.move_to(this.moveTarget)
    this.npc.movementController.resume()
  }

  update(deltaTime: number) {
    if (this.isInterrupted || !this.isStarted) return
    // Update movement
    this.npc.movementController.move(deltaTime)

    if (this.isFailed) {
      console.log("MoveAction detected movement failure.")
      this.isCompletedFlag = true
      return
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
