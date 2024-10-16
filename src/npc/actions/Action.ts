import { NPC } from "../client"

// Action.ts
export abstract class Action {
  protected npc: NPC
  protected isInterrupted: boolean = false
  protected isStarted: boolean = false
  protected isCompletedFlag: boolean = false

  constructor(npc: NPC) {
    this.npc = npc
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
