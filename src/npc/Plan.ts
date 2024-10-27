import { ActionPlan, ActionPlanSchema } from "../shared/types"
import { AiBrainReflections } from "./AiBrain"
import client from "./openai"
import { planning_prompt } from "./prompts"
import { zodResponseFormat } from "openai/helpers/zod.mjs"
import { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { z } from "zod"

const ResponseSchema = z.object({
  plan: ActionPlanSchema,
})

const validateActions = (
  plan: ActionPlan,
  places: string[],
  playerNames: string[],
): { isValid: boolean; error?: string } => {
  for (const action of plan) {
    if (action.type === "broadcast" && !places.includes(action.targetPlace)) {
      return {
        isValid: false,
        error: `Invalid place: ${action.targetPlace} for the broadcast action. Only ${places.join(", ")} are available`,
      }
    }
    if (action.type === "listen" && !places.includes(action.targetPlace)) {
      return {
        isValid: false,
        error: `Invalid place: ${action.targetPlace} for the listen action. Only ${places.join(", ")} are available`,
      }
    }

    if (action.type === "move" && action.target.targetType !== "coordinates") {
      if (action.target.targetType === "place" && !places.includes(action.target.name)) {
        return {
          isValid: false,
          error: `Invalid place: ${action.target.name} for the move action. Only ${places.join(", ")} are available`,
        }
      }
      if (action.target.targetType === "person" && !playerNames.includes(action.target.name)) {
        return {
          isValid: false,
          error: `Invalid person ${action.target.name} for the move action. Only ${playerNames.join(
            ", ",
          )} are available`,
        }
      }
    }
    if (action.type === "talk" && !playerNames.includes(action.name)) {
      return {
        isValid: false,
        error: `Invalid person for talk: ${action.name}. Only ${playerNames.join(", ")} are available`,
      }
    }
  }
  return { isValid: true }
}

export const generatePlanForTheday = async (
  npcBackground: AiBrainReflections,
  playerNames: string[],
  places: string[],
): Promise<ActionPlan> => {
  let attemps = 0
  let maxAttemps = 5

  let isValid = false
  let errorMessage = ""
  let plan: ActionPlan

  const prompt = planning_prompt(npcBackground)
  let messages = [{ role: "system", content: prompt }] as ChatCompletionMessageParam[]

  while (attemps < maxAttemps) {
    attemps++
    const completion = await client.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: messages,
      response_format: zodResponseFormat(ResponseSchema, "plan"),
    })

    const parsed = completion.choices[0].message.parsed
    if (!parsed) {
      throw new Error("Couldn't create a plan")
    }

    plan = parsed.plan
    const validation = validateActions(plan, places, playerNames)
    isValid = validation.isValid
    errorMessage = validation.error || ""
    if (!isValid) {
      messages.push({ role: "system", content: errorMessage })
      console.error("Invalid plan, retrying...", errorMessage)
    }
    if (isValid) {
      console.log("Plan created:", plan)
      return plan
    }
  }
  throw new Error("Couldn't create a plan")
}
