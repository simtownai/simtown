import { createRandomSpriteDefinition } from "../shared/functions"
import { PlayerSpriteDefinition } from "../shared/types"

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
    backstory: ["I used to live in a small village.", "I love talking with people."],
  },
  {
    username: "Mark",
    spriteDefinition: createRandomSpriteDefinition(),
    id: "2",
    backstory: [
      "I used to live in a small village.",
      "I  hate talking with people",
      "I will reply only if asked to move.",
    ],
  },
]
