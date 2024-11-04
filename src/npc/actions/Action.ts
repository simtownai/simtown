import { EmitInterface } from "../SocketManager"
import { BrainDump } from "../brain/AIBrain"

export abstract class Action {
  isInterrupted: boolean = false
  shouldReflect: boolean
  protected isStarted: boolean = false
  protected isCompletedFlag: boolean = false
  protected reason: string
  protected elapsedTime: number = 0
  getBrainDump: () => BrainDump
  getEmitMethods: () => EmitInterface

  constructor(
    getBrainDump: () => BrainDump,
    getEmitMethods: () => EmitInterface,
    reason: string = "",
    shouldReflect: boolean = true,
  ) {
    this.getBrainDump = getBrainDump
    this.getEmitMethods = getEmitMethods
    this.reason = reason
    this.shouldReflect = shouldReflect
  }

  abstract start(): void
  abstract update(deltaTime: number): void

  interrupt(): void {
    this.isInterrupted = true
  }
  markAsCompleted(): void {
    this.isCompletedFlag = true
  }

  resume(): void {
    this.isInterrupted = false
  }

  isCompleted(): boolean {
    return this.isCompletedFlag
  }
}
