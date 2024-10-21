import { NPC } from "../client"
import { Action } from "./Action"

export class MoveAction extends Action {
  private targetPosition: { x: number; y: number }
  isStarted: boolean = false
  isFailed: boolean = false // New flag for movement failure

  constructor(npc: NPC, targetPosition: { x: number; y: number }) {
    super(npc)
    this.targetPosition = targetPosition
  }

  async start() {
    console.log("MoveAction start", this.targetPosition)

    this.isStarted = true
    this.npc.movementController.setMovementFailedCallback(() => {
      console.log("Movement failed callback received in MoveAction")
      this.isFailed = true
    })
    this.npc.movementController.setMovementCompletedCallback(() => {
      console.log("Movement completed callback received in MoveAction")
      this.isCompletedFlag = true
    })

    this.npc.move_to(this.targetPosition)
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
    this.npc.movementController.resume()
  }
}
