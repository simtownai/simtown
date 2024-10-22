import { ActionPlan, ActionPlanSchema } from "../shared/types"
import { NpcConfig } from "./npcConfig"
import client from "./openai"
import { zodResponseFormat } from "openai/helpers/zod.mjs"
import { z } from "zod"

const ResponseSchema = z.object({
  plan: ActionPlanSchema,
})

export const generatePlanForTheday = async (
  npcConfig: NpcConfig,
  player_names: string[],
  places_names: string[],
): Promise<ActionPlan> => {
  const backstory = npcConfig.backstory
  console.log("Player names are", player_names)

  const completion = await client.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Generate a plan for NPC ${npcConfig.username} with the backstory: ${backstory}.\n\nOther players in the game are: ${player_names}.\n\nPlaces that you can go to: ${places_names}\n\n. The NPC can perform actions such as move or talk. When moving, the target can be coordinates (with x and y values), a person (by name), or a place (by name). You can only talk or move to existing players or locations.`,
      },
    ],
    response_format: zodResponseFormat(ResponseSchema, "plan"),
  })

  const parsed = completion.choices[0].message.parsed
  if (!parsed) {
    throw new Error("Couldn't create a plan")
  }

  return parsed.plan
}
