import { NpcConfig } from "./npcConfig"
import client from "./openai"
import { zodResponseFormat } from "openai/helpers/zod.mjs"
import { z } from "zod"

const MoveSchema = z.object({
  type: z.literal("move"),

  target: z.string(),
})

const TalkSchema = z.object({
  type: z.literal("talk"),
  name: z.string(),
})

const IdleSchema = z.object({
  type: z.literal("idle"),
})

const ActionSchema = z.discriminatedUnion("type", [MoveSchema, TalkSchema, IdleSchema])

const ActionPlanSchema = z.array(ActionSchema)

const ResponseSchema = z.object({
  plan: ActionPlanSchema,
})

export type ActionPlan = z.infer<typeof ActionPlanSchema>

export const generatePlanForTheday = async (npcConfig: NpcConfig, player_names: string[]): Promise<ActionPlan> => {
  const backstory = npcConfig.backstory
  console.log("Player names are", player_names)
  const completion = await client.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Generate a plan for NPC ${npcConfig.username} with the backstory: ${backstory}. Other players in the game are: ${player_names}. You can only talk or move to existing players.`,
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
