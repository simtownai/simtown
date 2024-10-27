import { BroadcastMessage } from "../../shared/types"
import { BrainDump } from "../brain/AIBrain"
import client from "../openai/openai"
import { broadcast_prompt } from "../prompts"
import { Action } from "./Action"
import { Socket } from "socket.io-client"

export class BroadcastAction extends Action {
  broadcastContent: string = ""
  private broadcastInterval: NodeJS.Timeout | null = null
  private broadcastIndex: number = 0
  private chunkSize: number = 100 // Characters per chunk
  targetPlace: string

  constructor(getBrainDump: () => BrainDump, socket: Socket, targetPlace: string, reason: string = "") {
    super(getBrainDump, socket, reason)
    this.targetPlace = targetPlace
  }

  async start(): Promise<void> {
    this.isStarted = true
    await this.generateBroadcast()
    this.startBroadcasting()
  }

  private async generateBroadcast(): Promise<void> {
    try {
      const system_message = broadcast_prompt(this.getBrainDump().getStringifiedBrainDump())
      const completion = await client.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "system", content: system_message }],
      })

      this.broadcastContent = completion.choices[0].message.content || ""
    } catch (error) {
      console.error("Error generating broadcast content:", error)
      this.broadcastContent = "Error generating broadcast content."
    }
  }

  private startBroadcasting(): void {
    this.broadcastInterval = setInterval(() => {
      if (this.broadcastIndex >= this.broadcastContent.length) {
        this.endBroadcast()
        return
      }

      const chunk = this.broadcastContent.slice(this.broadcastIndex, this.broadcastIndex + this.chunkSize)
      this.broadcastIndex += this.chunkSize

      const broadcastMessage: BroadcastMessage = {
        from: this.getBrainDump().playerData.username,
        message: chunk,
        place: this.targetPlace,
        date: new Date().toISOString(),
      }

      this.socket.emit("broadcast", broadcastMessage)
    }, 5000) // Emit every 5 seconds
  }

  private endBroadcast(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval)
      this.broadcastInterval = null
    }
    this.isCompletedFlag = true
  }

  update(_deltaTime: number): void {
    // No need for update logic, broadcasting is handled by interval
  }

  interrupt(): void {
    super.interrupt()
    this.endBroadcast()
  }

  resume(): void {
    super.resume()
    if (!this.isCompletedFlag) {
      this.startBroadcasting()
    }
  }
}
