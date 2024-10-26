import { ChatMessage } from "../../shared/types"
import { NPC } from "../client"
import { Action } from "./Action"

export class ListenAction extends Action {
  accumulatedBroadcast: string = ""
  private broadcastListener: (message: ChatMessage) => void
  targetPlace: string

  constructor(npc: NPC, targetPlace: string, reason: string = "") {
    super(npc, reason)
    this.targetPlace = targetPlace
    this.broadcastListener = this.handleBroadcast.bind(this)
  }

  start(): void {
    this.isStarted = true
    this.npc.socket.on("listenBroadcast", this.broadcastListener)
  }

  private handleBroadcast(message: ChatMessage): void {
    if (this.npc.actionManager.getCurrentAction() instanceof ListenAction) {
      this.accumulatedBroadcast += message.message
      console.log(`${this.npc.playerData.username} received broadcast: ${message.message}`)
    }
  }

  update(_deltaTime: number): void {
    // No need for update logic, listening is handled by socket event
  }

  isCompleted(): boolean {
    // You might want to implement a condition to end the listening
    // For now, it will continue listening indefinitely
    return false
  }

  interrupt(): void {
    super.interrupt()
    this.npc.socket.off("broadcast", this.broadcastListener)
  }

  resume(): void {
    super.resume()
    this.npc.socket.on("broadcast", this.broadcastListener)
  }

  getAccumulatedBroadcast(): string {
    return this.accumulatedBroadcast
  }
}
