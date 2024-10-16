import { z } from "zod"

export const ConversationTimeoutThreshold = 50000

export type NpcConfig = {
  id: string
  backstory: string[]
}

export const npcConfig: NpcConfig[] = [
  {
    id: "1",
    backstory: [
      "I used to live in a small village.",
      "I love exploring new places. Initialize a conversation with sb.",
    ],
  },
  // {
  //   id: "2",
  //   backstory: ["I hate talking with people", "I prefer being idle.", "I will reply only if asked to move."],
  // },
]

export const move_to_args = z.object({
  x: z.number(),
  y: z.number(),
})
