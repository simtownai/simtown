import {
  characteraiNPCConfigs,
  electiontownNPCConfigs,
  harryNPCConfigs,
  murderdronesNPCConfigs,
} from "../npc/npcConfig"
import { characterAIPromptSystem, electiontownPromptSystem, harryPromptSystem } from "../npc/prompts"
import { electiontownMap, harrygobletoffireMap } from "../shared/maps"
import { RoomConfig } from "../shared/types"

export const roomsConfig: RoomConfig[] = [
  {
    path: "electiontown",
    instanceType: "shared",
    NPCConfigs: electiontownNPCConfigs,
    promptSystem: electiontownPromptSystem,
    mapConfig: electiontownMap,
  },
  {
    path: "characterai",
    instanceType: "private",
    NPCConfigs: characteraiNPCConfigs,
    promptSystem: characterAIPromptSystem,
    mapConfig: electiontownMap,
  },
  {
    path: "murderdrones",
    instanceType: "private",
    NPCConfigs: murderdronesNPCConfigs,
    promptSystem: characterAIPromptSystem,
    mapConfig: electiontownMap,
  },
  {
    path: "harry",
    instanceType: "private",
    NPCConfigs: harryNPCConfigs,
    promptSystem: harryPromptSystem,
    mapConfig: harrygobletoffireMap,
  },
]
