// IdleAction.ts
import { NPC } from "../client"
import { Action } from "./Action"

export class IdleAction extends Action {
  private idleTime: number
  private elapsedTime: number = 0

  constructor(npc: NPC, idleTime: number) {
    super(npc)
    this.idleTime = idleTime
  }

  start() {
    this.isStarted = true
  }

  update(deltaTime: number) {
    if (this.isInterrupted || !this.isStarted) return

    this.elapsedTime += deltaTime
    if (this.elapsedTime >= this.idleTime) {
      this.isCompletedFlag = true
    }
  }
}
