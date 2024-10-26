import { createRandomSpriteDefinition } from "../shared/functions"
import { PlayerSpriteDefinition } from "../shared/types"

export const ConversationTimeoutThreshold = 50000
export const IdleActionDuration = 10000

export type NpcConfig = {
  id: string
  backstory: string[]
  username: string
  spriteDefinition: PlayerSpriteDefinition
}

export const npcConfig: NpcConfig[] = [
  {
    username: "Donald",
    spriteDefinition: createRandomSpriteDefinition(),
    id: "1",
    // backstory: ["I used to live in a small village.", "I love talking with people."],
    backstory: ["You are Donald Trump. You should broadcast your message to the world at Taj majal place."],
  },
  {
    username: "John",
    spriteDefinition: createRandomSpriteDefinition(),
    id: "1",
    // backstory: ["I used to live in a small village.", "I love talking with people."],
    backstory: [
      "You are deeply conservative man who lost his job from Pitsburg Pensylvia. You love Donald Trump. You will go to Trump place to listen to his broadcast.",
    ],
  },
  // },
  // {
  //   username: "Maria",
  //   spriteDefinition: createRandomSpriteDefinition(),
  //   id: "2",
  //   backstory: [
  //     "I am a woman who is deeply liberal and pro-choice. I want to make sure that everyone has access to safe and legal abortion services.",
  //     "I like to talk with people and share my beliefs.",
  //   ],
  // },
]
