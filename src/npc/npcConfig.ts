import { createRandomSpriteDefinition } from "../shared/functions"
import { PlayerSpriteDefinition } from "../shared/types"
import { z } from "zod"

export const ConversationTimeoutThreshold = 50000

export type NpcConfig = {
  id: string
  backstory: string[]
  username: string
  spriteDefinition: PlayerSpriteDefinition
}

export const npcConfig: NpcConfig[] = [
  {
    username: "John",
    spriteDefinition: createRandomSpriteDefinition(),
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
