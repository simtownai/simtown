import { EmitInterface } from "../SocketManager"
import { BrainDump } from "../brain/AIBrain"

export abstract class Action {
  isInterrupted: boolean = false
  protected isStarted: boolean = false
  protected isCompletedFlag: boolean = false
  protected reason: string
  getBrainDump: () => BrainDump
  getEmitMethods: () => EmitInterface

  constructor(getBrainDump: () => BrainDump, getEmitMethods: () => EmitInterface, reason: string = "") {
    this.getBrainDump = getBrainDump
    this.getEmitMethods = getEmitMethods
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
