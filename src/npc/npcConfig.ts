import { createRandomSpriteDefinition } from "../shared/functions"
import { PlayerSpriteDefinition } from "../shared/types"

export const ConversationTimeoutThreshold = 50000
export const IdleActionDuration = 10000

export type NpcConfig = {
  backstory: string[]
  username: string
  spriteDefinition: PlayerSpriteDefinition
  key_knowledge: string
  trigger_for_knowledge: string
}

export const npcConfig: NpcConfig[] = [
  {
    username: "mike-police",
    spriteDefinition: {
      body: "Body_02",
      eyes: "Eyes_01",
      outfit: "Outfit_19_01",
      hairstyle: "Hairstyle_13_06",
      accessory: "Accessory_06_Policeman_Hat_05",
    },
    backstory: [
      "Mike has been the town's dedicated police officer for over a decade. Growing up in this close-knit community, he has a deep sense of responsibility and loyalty towards its residents. Mike served alongside Joe during their younger years, sharing a bond that was strained due to personal disagreements and misunderstandings. Despite their fallout, Mike has always kept an eye out for Joe, hoping he would return or at least find peace. Mike is known for his integrity and protective nature, often going above and beyond his duty to help those in need.",
    ],
    key_knowledge:
      "Joe has a brother named Peter. Their relationship deteriorated due to past disagreements, and Joe has recently been interested in reconnecting with family.",
    trigger_for_knowledge:
      "Player builds rapport with Mike by expressing a genuine interest in preserving the town's history and persuades him to share secrets about Joe.",
  },

  {
    username: "joe-truck-driver",
    spriteDefinition: {
      body: "Body_07",
      eyes: "Eyes_04",
      outfit: "Outfit_02_02",
      hairstyle: "Hairstyle_12_03",
      accessory: "Accessory_13_Beard_01",
    },
    backstory: [
      "Joe is a seasoned truck driver who has spent most of his adult life on the road, transporting goods across various states. Known for his reliability and vast array of road stories, Joe is a familiar face in the town but keeps to himself regarding his personal life. Years ago, Joe had a falling out with his brother Peter, leading to a long period of estrangement. This conflict drove Joe to seek solace in his work, distancing himself from family ties. Recently, after years of solitude, Joe has begun to reflect on his past and considers the possibility of reconnecting with Peter, seeking closure and understanding.",
    ],
    key_knowledge:
      "Joe confirms that he and Peter are brothers and indicates willingness to reconnect with Peter, which is necessary for Peter to reveal the final location of the constitutional papers.",
    trigger_for_knowledge:
      "Player uses the information obtained from Mike about Peter being Joe's brother to convince Joe to acknowledge their relationship and consider reconnecting.",
  },
  {
    username: "peter-business-owner",
    spriteDefinition: {
      body: "Body_04",
      eyes: "Eyes_04",
      outfit: "Outfit_26_02",
      hairstyle: "Hairstyle_14_05",
      accessory: "Accessory_13_Beard_04",
    },
    backstory: [
      "Peter is a successful and well-respected business owner in the town, running a prominent local establishment that serves as a hub for community gatherings. Ambitious and resourceful, Peter has always been driven to contribute positively to the town's development. Despite his outward success, Peter harbors a deep sense of longing for his brother Joe, with whom he lost contact years ago due to unresolved conflicts. Peter has never given up hope of reconnecting with Joe and believes that restoring their relationship could bring closure and perhaps new opportunities for both. His knowledge of the constitutional papers ties back to his family's history, making the recovery of these documents personally significant.",
    ],
    key_knowledge:
      "The constitutional papers are hidden in the amphitheater, specifically under the old oak tree by the stage.",
    trigger_for_knowledge:
      "Player proves to Peter that Joe is alive and has acknowledged their brotherly relationship, thereby assuring Peter that Joe is safe and prompting him to reveal the final location of the papers.",
  },

  // {
  //   username: "maria teacher",
  //   spriteDefinition: {
  //     body: "Body_04",
  //     eyes: "Eyes_01",
  //     outfit: "Outfit_18_02",
  //     hairstyle: "Hairstyle_25_05",
  //     accessory: "Accessory_15_Glasses_06",
  //   },
  //   backstory: [],
  // },
]
