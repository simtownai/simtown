import { ActionPlan, ActionPlanSchema } from "../shared/types"
import { Action } from "./actions/Action"
import { NpcConfig } from "./npcConfig"
import client from "./openai"
import { createPlanDataFromActions } from "./planningHelpers"
import { zodResponseFormat } from "openai/helpers/zod.mjs"
import { z } from "zod"

const ResponseSchema = z.object({
  plan: ActionPlanSchema,
})

export const generatePlanForTheday = async (
  npcConfig: NpcConfig,
  player_names: string[],
  places_names: string[],
  currentActionQueue: Action[] = [],
  reflections: string[] = [],
): Promise<ActionPlan> => {
  const backstory = npcConfig.backstory
  const npcName = npcConfig.username
  const reflectionsSummary = reflections.join("\n")

  console.log("reflections are", reflectionsSummary)

  // Serialize the current action queue
  const existingPlanData = JSON.stringify(createPlanDataFromActions(currentActionQueue))
  console.log("existing plandata is", existingPlanData)

  // Build the prompt with clear instructions and context
  const prompt = `
You are an AI that generates action plans for NPCs in a simulation game.

**NPC Name**: ${npcName}
**Backstory**: ${backstory}

**Other players in the game**: ${player_names.join(", ")}
**Places you can go**: ${places_names.join(", ")}

**Past reflections**:
${reflectionsSummary}

**Current planned actions**:
${JSON.stringify(existingPlanData)}

The NPC can perform the following actions:
- **Move**: Move to a target (coordinates, person by name, or place by name).
- **Talk**: Talk to a person by name.
- **Idle**: Do nothing for a period.

**Constraints**:
- You can choose to **keep**, **modify**, or **discard** the existing planned actions.
- You can only talk or move to existing players or locations.

**Instructions**:
- Generate a new action plan for the NPC, considering the existing planned actions.
- Ensure the new plan aligns with their backstory and reflections.
- If you add or modify existing actions, briefly explain why in comments.
`

  // Make the AI request
  const completion = await client.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: prompt }],
    response_format: zodResponseFormat(ResponseSchema, "plan"),
  })

  const parsed = completion.choices[0].message.parsed
  if (!parsed) {
    throw new Error("Couldn't create a plan")
  }
  console.log("Generated plan for the day:", parsed.plan)
  return parsed.plan
}
