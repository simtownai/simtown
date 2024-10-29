// IdleAction.ts
import { IdleActivityType } from "../../shared/types"
import { EmitInterface } from "../SocketManager"
import { BrainDump } from "../brain/AIBrain"
import { IdleActionDuration } from "../npcConfig"
import { Action } from "./Action"

export class IdleAction extends Action {
  activityType: IdleActivityType

  constructor(
    getBrainDump: () => BrainDump,
    getEmitMethods: () => EmitInterface,
    activityType: IdleActivityType,
    reason: string = "",
  ) {
    super(getBrainDump, getEmitMethods, reason)
    this.activityType = activityType
  }

  start() {
    this.setAnimation()
    this.isStarted = true
    console.log("Idle action started")
  }

  update(deltaTime: number) {
    if (this.isInterrupted || !this.isStarted) {
      this.resetAnimation()
      return
    }

    this.elapsedTime += deltaTime
    if (this.elapsedTime >= IdleActionDuration) {
      this.resetAnimation()
      this.isCompletedFlag = true
      console.log("Idle action completed")
    }
  }

  private setAnimation() {
    const playerData = this.getBrainDump().playerData
    if (this.activityType === "read") {
      this.getEmitMethods().updatePlayerData({
        animation: `${playerData.username}-read`,
      })
    }
  }

  private resetAnimation() {
    const playerData = this.getBrainDump().playerData
    if (this.activityType === "read") {
      this.getEmitMethods().updatePlayerData({
        animation: `${playerData.username}-idle-down`,
      })
    }
  }
}
