import { ActionPlan, ActionPlanSchema } from "../shared/types"
import { NPC } from "./client"
import client from "./openai"
import { planning_prompt } from "./prompts"
import { zodResponseFormat } from "openai/helpers/zod.mjs"
import { z } from "zod"

const ResponseSchema = z.object({
  plan: ActionPlanSchema,
})

export const generatePlanForTheday = async (npc: NPC): Promise<ActionPlan> => {
  const npcBackground = npc.aiBrain.getNPCMemories()
  const prompt = planning_prompt(npcBackground)

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
