// IdleAction.ts
import { BrainDump } from "../brain/AIBrain"
import { IdleActionDuration } from "../npcConfig"
import { Action } from "./Action"
import { Socket } from "socket.io-client"

export class IdleAction extends Action {
  private elapsedTime: number = 0

  constructor(getBrainDump: () => BrainDump, socket: Socket, reason: string = "") {
    super(getBrainDump, socket, reason)
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
