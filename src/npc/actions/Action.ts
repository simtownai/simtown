import { BrainDump } from "../brain/AIBrain"
import { Socket } from "socket.io-client"

export abstract class Action {
  isInterrupted: boolean = false
  protected isStarted: boolean = false
  protected isCompletedFlag: boolean = false
  protected reason: string
  getBrainDump: () => BrainDump
  protected socket: Socket

  constructor(getBrainDump: () => BrainDump, socket: Socket, reason: string = "") {
    this.getBrainDump = getBrainDump
    this.socket = socket
    this.reason = reason
  }

  abstract start(): void
  abstract update(deltaTime: number): void

  interrupt(): void {
    this.isInterrupted = true
  }

  resume(): void {
    this.isInterrupted = false
  }

  isCompleted(): boolean {
    return this.isCompletedFlag
  }
}
