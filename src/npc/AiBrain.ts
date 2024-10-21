// AiBrain.ts
import { Memory } from "./memory"
import { NpcConfig } from "./npcConfig"
import { Socket } from "socket.io-client"

export interface FunctionSchema {
  type: string
  function: {
    name: string
    description: string
    parameters: {
      type: string
      properties: { [key: string]: any }
      required: string[]
    }
  }
}

interface AiBrainOptions {
  npcConfig: NpcConfig
  socket: Socket
}
export class AiBrain {
  public memory: Memory
  npcConfig: NpcConfig

  constructor(options: AiBrainOptions) {
    this.memory = new Memory(options.npcConfig)

    // Initialize planForTheDay asynchronously
  }

  // Async initialization method

  async plan() {
    // Implementation for planning (if needed)
  }
}
