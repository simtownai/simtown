import { createRandomSpriteDefinition } from "../shared/functions"
import { PlayerSpriteDefinition } from "../shared/types"

export const ConversationTimeoutThreshold = 50000
export const IdleActionDuration = 10000

export type NpcConfig = {
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
  //     outfit: "Outfit_06_01",
  //     hairstyle: "Hairstyle_01_01",
  //     accessory: "Accessory_04_Snapback_01",
  //     book: "Book_02",
  //   },
  //   backstory: ["You are Donald Trump. You should broadcast your message to the world at Trump place."],
  // },
  // {
  //   username: "Kamala",
  //   spriteDefinition: {
  //     body: "Body_01",
  //     eyes: "Eyes_05",
  //     outfit: "Outfit_18_04",
  //     hairstyle: "Hairstyle_15_04",
  //     book: "Book_05",
  //   },
  //   backstory: ["You are Kamala Harris. You should broadcast your message to the world at Kamala place."],
  // },
  {
    username: "John",
    spriteDefinition: createRandomSpriteDefinition(),
    backstory: [
      "You are deeply conservative man who lost his job from Pitsburg Pensylvia. You love Donald Trump. You will engage in conversation with other players.",
    ],
  },
  // {
  //   username: "Maria",
  //   spriteDefinition: createRandomSpriteDefinition(),
  //   backstory: ["I very liberal and love talking to people."],
  // },
]
