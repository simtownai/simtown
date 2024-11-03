import logger from "../../shared/logger"
import { VoteCandidate, VoteCandidateSchema, availableVoteCandidates } from "../../shared/types"
import { EmitInterface } from "../SocketManager"
import { BrainDump } from "../brain/AIBrain"
import { generateJson } from "../openai/generateJson"
import { vote_prompt } from "../prompts"
import { Action } from "./Action"
import { z } from "zod"

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

      const CandidateResponse = z.object({ candidate: VoteCandidateSchema })

      const chosenCandidate = (
        await generateJson(system_message, CandidateResponse, () => ({
          isValid: true,
        }))
      ).candidate

      logger.debug(`(${this.getBrainDump().playerData.username}) Generated vote result: ${chosenCandidate}`)

      if (!availableVoteCandidates.includes(chosenCandidate)) {
        logger.error(
          `(${this.getBrainDump().playerData.username}) Invalid vote candidate chosen: '${chosenCandidate}'. Valid candidates are: ${availableVoteCandidates.join(", ")}`,
        )
        return
      }
      this.chosenCandidate = chosenCandidate
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
