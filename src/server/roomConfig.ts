import {
  characteraiNPCConfigs,
  electiontownNPCConfigs,
  harryNPCConfigs,
  murderdronesNPCConfigs,
} from "../npc/npcConfig"
import { characterAIPromptSystem, electiontownPromptSystem, harryPromptSystem } from "../npc/prompts"
import { RoomConfig } from "../shared/types"

export const roomsConfig: RoomConfig[] = [
  {
    path: "electiontown",
    instanceType: "shared",
    NPCConfigs: electiontownNPCConfigs,
    promptSystem: electiontownPromptSystem,
  },
  {
    path: "characterai",
    instanceType: "private",
    NPCConfigs: characteraiNPCConfigs,
    promptSystem: characterAIPromptSystem,
  },
  {
    path: "murderdrones",
    instanceType: "private",
    NPCConfigs: murderdronesNPCConfigs,
    promptSystem: characterAIPromptSystem,
  },
  {
    path: "harry",
    instanceType: "private",
    NPCConfigs: harryNPCConfigs,
    promptSystem: harryPromptSystem,
  },
]
