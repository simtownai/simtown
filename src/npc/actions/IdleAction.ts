// IdleAction.ts
import { NPC } from "../client"
import { IdleActionDuration } from "../npcConfig"
import { Action } from "./Action"

export class IdleAction extends Action {
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
    if (this.elapsedTime >= IdleActionDuration) {
      this.isCompletedFlag = true
      console.log("Idle action completed")
    }
  }
}
