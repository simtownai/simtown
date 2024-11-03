import { ActionPlanSchema, GeneratedActionPlan } from "../../shared/types"
import { StringifiedBrainDump } from "../brain/AIBrain"
import { generateJson } from "../openai/generateJson"
import { planning_prompt } from "../prompts"
import { z } from "zod"

const ResponseSchema = z.object({
  plan: ActionPlanSchema,
})

const validateActions =
  (places: string, playerNames: string) =>
  (response: z.infer<typeof ResponseSchema>): { isValid: boolean; error?: string } => {
    const plan = response.plan
    for (const action of plan) {
      if (action.type === "broadcast" && !places.includes(action.targetPlace)) {
        return {
          isValid: false,
          error: `Invalid place: ${JSON.stringify(action.targetPlace)} for the broadcast action. Only ${JSON.stringify(
            places,
          )} are available`,
        }
      }
      if (action.type === "listen" && !places.includes(action.targetPlace)) {
        return {
          isValid: false,
          error: `Invalid place: ${JSON.stringify(action.targetPlace)} for the listen action. Only ${JSON.stringify(
            places,
          )} are available`,
        }
      }

      if (action.type === "move" && action.target.targetType !== "coordinates") {
        if (action.target.targetType === "place" && !places.includes(action.target.name)) {
          return {
            isValid: false,
            error: `Invalid place: ${JSON.stringify(action.target.name)} for the move action. Only ${JSON.stringify(
              places,
            )} are available`,
          }
        }
      }
      if (action.type === "talk" && !playerNames.includes(action.name)) {
        return {
          isValid: false,
          error: `Invalid person for talk action: ${JSON.stringify(action.name)}. Only ${JSON.stringify(
            playerNames,
          )} are available`,
        }
      }
    }
    return { isValid: true }
  }
export const generatePlanForTheday = async (
  stringifiedBrainDump: StringifiedBrainDump,
): Promise<GeneratedActionPlan> => {
  const prompt = planning_prompt(stringifiedBrainDump)

  const response = await generateJson(
    prompt,
    ResponseSchema,
    validateActions(stringifiedBrainDump.placesNames, stringifiedBrainDump.playerNames),
  )

  return response.plan
}
