import logger from "../../shared/logger"
import { BroadcastMessage } from "../../shared/types"
import { EmitInterface } from "../SocketManager"
import { BrainDump } from "../brain/AIBrain"
import client from "../openai/openai"
import { broadcast_prompt } from "../prompts"
import { Action } from "./Action"

export class BroadcastAction extends Action {
  broadcastContent: string = ""
  private broadcastInterval: NodeJS.Timeout | null = null
  private sentences: string[] = []
  private sentenceIndex: number = 0
  targetPlace: string

  constructor(
    getBrainDump: () => BrainDump,
    getEmitMethods: () => EmitInterface,
    targetPlace: string,
    reason: string = "",
    private onEnd: () => void,
  ) {
    super(getBrainDump, getEmitMethods, reason)
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
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: system_message }],
      })

      this.broadcastContent = completion.choices[0].message.content || ""
      this.sentences = this.splitIntoSentences(this.broadcastContent)
    } catch (error) {
      logger.error("Error generating broadcast content:", error)
      this.broadcastContent = "Error generating broadcast content."
      this.sentences = [this.broadcastContent]
    }
  }

  private splitIntoSentences(text: string): string[] {
    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g)
    if (sentences) {
      return sentences.map((sentence) => sentence.trim())
    } else {
      return [text]
    }
  }

  private startBroadcasting(): void {
    this.broadcastInterval = setInterval(() => {
      if (this.sentenceIndex >= this.sentences.length) {
        this.onEnd()
        this.endBroadcast()
        return
      }

      const sentence = this.sentences[this.sentenceIndex]
      this.sentenceIndex += 1

      const broadcastMessage: BroadcastMessage = {
        from: this.getBrainDump().playerData.username,
        message: sentence,
        place: this.targetPlace,
        date: new Date().toISOString(),
      }
      this.getEmitMethods().emitBroadcast(broadcastMessage)
    }, 2500)
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
