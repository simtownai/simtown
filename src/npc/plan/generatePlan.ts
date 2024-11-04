import { getBroadcastAnnouncementsKey } from "../../shared/functions"
import { ActionPlanSchema, GeneratedActionPlan } from "../../shared/types"
import { BrainDump, StringifiedBrainDump } from "../brain/AIBrain"
import { generateJson } from "../openai/generateJson"
import { planning_prompt } from "../prompts"
import { z } from "zod"

function ifBroadcastAnnouncedAtPlace(broadcastAnnouncementsCache: Set<string>, targetPlace: string): boolean {
  return Array.from(broadcastAnnouncementsCache.values()).some((key) => key.includes(targetPlace))
}

const ResponseSchema = z.object({
  plan: ActionPlanSchema,
})

const validateActions =
  (places: string, playerNames: string, getBrainDump: () => BrainDump) =>
  (response: z.infer<typeof ResponseSchema>): { isValid: boolean; error?: string } => {
    const plan = response.plan
    for (const action of plan) {
      if (action.type === "broadcast") {
        if (!places.includes(action.targetPlace)) {
          return {
            isValid: false,
            error: `(${getBrainDump().playerData.username}) Invalid place: ${JSON.stringify(action.targetPlace)} for the broadcast action. Only ${JSON.stringify(
              places,
            )} are available`,
          }
        }
        if (
          ifBroadcastAnnouncedAtPlace(getBrainDump().broadcastAnnouncementsCache, action.targetPlace) &&
          !getBrainDump().broadcastAnnouncementsCache.has(
            getBroadcastAnnouncementsKey(action.targetPlace, getBrainDump().playerData.username),
          )
        ) {
          return {
            isValid: false,
            error: `(${getBrainDump().playerData.username}) Broadcast already announced at ${action.targetPlace}. Existing broadcast announcements: ${JSON.stringify(
              Array.from(getBrainDump().broadcastAnnouncementsCache.values()),
            )}`,
          }
        }
      }
      if (action.type === "listen") {
        if (!places.includes(action.targetPlace)) {
          return {
            isValid: false,
            error: `(${getBrainDump().playerData.username}) Invalid place: ${JSON.stringify(action.targetPlace)} for the listen action. Only ${JSON.stringify(
              places,
            )} are available`,
          }
        }
        if (!ifBroadcastAnnouncedAtPlace(getBrainDump().broadcastAnnouncementsCache, action.targetPlace)) {
          return {
            isValid: false,
            error: `(${getBrainDump().playerData.username}) Broadcast not announced at ${action.targetPlace}. Existing broadcast announcements: ${JSON.stringify(
              Array.from(getBrainDump().broadcastAnnouncementsCache.values()),
            )}`,
          }
        }
      }
      if (action.type === "move" && action.target.targetType !== "coordinates") {
        if (action.target.targetType === "place" && !places.includes(action.target.name)) {
          return {
            isValid: false,
            error: `(${getBrainDump().playerData.username}) Invalid place: ${JSON.stringify(action.target.name)} for the move action. Only ${JSON.stringify(
              places,
            )} are available`,
          }
        }
      }
      if (action.type === "talk" && !playerNames.includes(action.name)) {
        return {
          isValid: false,
          error: `(${getBrainDump().playerData.username}) Invalid person for talk action: ${JSON.stringify(action.name)}. Only ${JSON.stringify(
            playerNames,
          )} are available`,
        }
      }
    }
    return { isValid: true }
  }

export const generatePlanForTheday = async (
  getBrainDump: () => BrainDump,
  stringifiedBrainDump: StringifiedBrainDump,
): Promise<GeneratedActionPlan> => {
  const prompt = planning_prompt(stringifiedBrainDump)

  const response = await generateJson(
    prompt,
    ResponseSchema,
    validateActions(stringifiedBrainDump.placesNames, stringifiedBrainDump.playerNames, getBrainDump),
  )

  return response.plan
}
