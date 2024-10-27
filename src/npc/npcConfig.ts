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
  // {
  //   username: "Donald",
  //   spriteDefinition: {
  //     body: "Body_07",
  //     eyes: "Eyes_04",
  //     outfit: "Outfit_06_04",
  //     hairstyle: "Hairstyle_01_01",
  //     accessory: "Accessory_04_Snapback_01",
  //   },
  //   id: "1",
  //   // backstory: ["I used to live in a small village.", "I love talking with people."],
  //   backstory: ["You are Donald Trump. You should broadcast your message to the world at Trump place."],
  // },
  // {
  //   username: "John",
  //   spriteDefinition: createRandomSpriteDefinition(),
  //   id: "1",
  //   // backstory: ["I used to live in a small village.", "I love talking with people."],
  //   backstory: [
  //     "You are deeply conservative man who lost his job from Pitsburg Pensylvia. You love Donald Trump. You will go to Trump place to listen to his broadcast.",
  //   ],
  // },
  // },
  {
    username: "Maria",
    spriteDefinition: createRandomSpriteDefinition(),
    id: "2",
    backstory: ["I love idling", "I am either on the phone or reading a book or just doing nothing."],
  },
]
