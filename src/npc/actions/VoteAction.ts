import logger from "../../shared/logger"
import { VoteCandidate, availableVoteCandidates } from "../../shared/types"
import { EmitInterface } from "../SocketManager"
import { BrainDump } from "../brain/AIBrain"
import client from "../openai/openai"
import { vote_prompt } from "../prompts"
import { Action } from "./Action"

export class VoteAction extends Action {
  chosenCandidate: VoteCandidate

  constructor(getBrainDump: () => BrainDump, getEmitMethods: () => EmitInterface, reason: string = "") {
    super(getBrainDump, getEmitMethods, reason)
  }

  async start(): Promise<void> {
    this.isStarted = true
    await this.vote()
    this.isCompletedFlag = true
  }

  private async vote(): Promise<void> {
    try {
      const system_message = vote_prompt(this.getBrainDump().getStringifiedBrainDump(), [
        ...availableVoteCandidates,
      ] as string[])
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: system_message }],
      })

      const chosenCandidate = completion.choices[0].message.content
      logger.debug(`(${this.getBrainDump().playerData.username}) Generated vote result: ${chosenCandidate}`)

      if (!availableVoteCandidates.includes(chosenCandidate as VoteCandidate)) {
        logger.error(
          `(${this.getBrainDump().playerData.username}) Invalid vote candidate chosen: '${chosenCandidate}'. Valid candidates are: ${availableVoteCandidates.join(", ")}`,
        )
        return
      }
      this.chosenCandidate = chosenCandidate as VoteCandidate
      this.getEmitMethods().emitVoteResult(this.chosenCandidate)
    } catch (error) {
      logger.error(`(${this.getBrainDump().playerData.username}) Error generating vote result:`, error)
    }
  }

  update(_deltaTime: number): void {}

  interrupt(): void {
    super.interrupt()
  }

  resume(): void {
    super.resume()
  }
}
