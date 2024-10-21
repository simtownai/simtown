// IdleAction.ts
import { NPC } from "../client"
import { Action } from "./Action"

export class IdleAction extends Action {
  private idleTime: number = 10000 // 10 seconds in milliseconds
  private elapsedTime: number = 0

  constructor(npc: NPC) {
    super(npc)
  }

  start() {
    this.isStarted = true
    console.log("Idle action started")
  }

  update(deltaTime: number) {
    if (this.isInterrupted || !this.isStarted) return

    this.elapsedTime += deltaTime
    if (this.elapsedTime >= this.idleTime) {
      this.isCompletedFlag = true
      console.log("Idle action completed after 10 seconds")
    }
  }
}
