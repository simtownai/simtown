import { NPC } from "../client"

// Action.ts
export abstract class Action {
  npc: NPC
  isInterrupted: boolean = false
  protected isStarted: boolean = false
  protected isCompletedFlag: boolean = false
  reason: string

  constructor(npc: NPC, reason: string = "") {
    this.npc = npc
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
