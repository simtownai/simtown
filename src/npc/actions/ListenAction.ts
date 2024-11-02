import logger from "../../shared/logger"
import { ChatMessage } from "../../shared/types"
import { EmitInterface } from "../SocketManager"
import { BrainDump } from "../brain/AIBrain"
import { Action } from "./Action"

export class ListenAction extends Action {
  accumulatedBroadcast: string = ""
  private broadcastListener: (message: ChatMessage) => void
  targetPlace: string
  private readonly ListenTimeoutThreshold = 15000
  private conversationTimeout: NodeJS.Timeout | null = null // for automatically timing out if no more messages

  constructor(
    getBrainDump: () => BrainDump,
    getEmitMethods: () => EmitInterface,
    targetPlace: string,
    reason: string = "",
    private adjustDirection: (username: string) => void,
  ) {
    super(getBrainDump, getEmitMethods, reason)
    this.targetPlace = targetPlace
    this.broadcastListener = this.handleBroadcast.bind(this)
  }

  private resetListenTimeout() {
    if (this.conversationTimeout) {
      clearTimeout(this.conversationTimeout)
      this.conversationTimeout = null
    }

    this.conversationTimeout = setTimeout(() => {
      this.isCompletedFlag = true
      logger.debug(`(${this.getBrainDump().playerData.username}) ListenAction timed out`)
    }, this.ListenTimeoutThreshold)
  }

  start(): void {
    this.isStarted = true
    this.resetListenTimeout()
    this.getEmitMethods().setListener("listenBroadcast", this.broadcastListener)
  }

  private handleBroadcast(message: ChatMessage): void {
    if (this.getBrainDump().currentAction instanceof ListenAction) {
      this.resetListenTimeout()
      this.adjustDirection(message.from)
      this.accumulatedBroadcast += message.message
    }
  }

  update(deltaTime: number): void {
    this.elapsedTime += deltaTime
    // No need for update logic, listening is handled by socket event
  }

  interrupt(): void {
    super.interrupt()
    if (this.conversationTimeout) {
      clearTimeout(this.conversationTimeout)
      this.conversationTimeout = null
    }
    this.getEmitMethods().removeListener("listenBroadcast", this.broadcastListener)
  }

  resume(): void {
    super.resume()
    this.getEmitMethods().setListener("listenBroadcast", this.broadcastListener)
    this.resetListenTimeout()
  }

  getAccumulatedBroadcast(): string {
    return this.accumulatedBroadcast
  }
}
