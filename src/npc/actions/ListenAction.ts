import { ChatMessage } from "../../shared/types"
import { EmitInterface } from "../SocketManager"
import { BrainDump } from "../brain/AIBrain"
import { Action } from "./Action"

export class ListenAction extends Action {
  accumulatedBroadcast: string = ""
  private broadcastListener: (message: ChatMessage) => void
  targetPlace: string

  constructor(
    getBrainDump: () => BrainDump,
    getEmitMethods: () => EmitInterface,
    targetPlace: string,
    reason: string = "",
  ) {
    super(getBrainDump, getEmitMethods, reason)
    this.targetPlace = targetPlace
    this.broadcastListener = this.handleBroadcast.bind(this)
  }

  start(): void {
    this.isStarted = true
    this.getEmitMethods().setListener("listenBroadcast", this.broadcastListener)
  }

  private handleBroadcast(message: ChatMessage): void {
    if (this.getBrainDump().currentAction instanceof ListenAction) {
      this.accumulatedBroadcast += message.message
      console.log(`${this.getBrainDump().playerData.username} received broadcast: ${message.message}`)
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
    this.getEmitMethods().removeListener("listenBroadcast", this.broadcastListener)
  }

  resume(): void {
    super.resume()
    this.getEmitMethods().setListener("listenBroadcast", this.broadcastListener)
  }

  getAccumulatedBroadcast(): string {
    return this.accumulatedBroadcast
  }
}
