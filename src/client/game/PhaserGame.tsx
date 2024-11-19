import { PlayerSpriteDefinition } from "../../shared/types"
import { EventBus } from "./EventBus"
import StartGame from "./main"
import { forwardRef, useEffect, useLayoutEffect, useRef } from "react"
import { Socket } from "socket.io-client"

export interface IRefPhaserGame {
  game: Phaser.Game | null
  scene: Phaser.Scene | null
}

interface IProps {
  socket: Socket
  username: string
  spriteDefinition: PlayerSpriteDefinition
  currentActiveScene?: (scene_instance: Phaser.Scene) => void
  isChatContainerCollapsed: boolean
  setIsChatContainerCollapsed: (value: boolean) => void
  setIsChatCollapsed: (value: boolean) => void
  setChatmate: (value: string) => void
  onGameLoaded: () => void
  soundEnabled: boolean
  setObservedNPC: (value: string) => void
  setIsObserveContainerCollapsed: (value: boolean) => void
}

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(function PhaserGame(
  {
    socket,
    username,
    spriteDefinition,
    currentActiveScene,
    isChatContainerCollapsed,
    setIsChatContainerCollapsed,
    setIsChatCollapsed,
    setChatmate,
    onGameLoaded,
    soundEnabled,
    setObservedNPC,
    setIsObserveContainerCollapsed,
  },
  ref,
) {
  const game = useRef<Phaser.Game | null>(null!)

  useLayoutEffect(() => {
    if (game.current === null) {
      game.current = StartGame("game-container", socket, username, spriteDefinition)

      if (typeof ref === "function") {
        ref({ game: game.current, scene: null })
      } else if (ref) {
        ref.current = { game: game.current, scene: null }
      }
    }

    return () => {
      if (game.current) {
        game.current.destroy(true)
        if (game.current !== null) {
          game.current = null
        }
      }
    }
  }, [ref])

  useEffect(() => {
    EventBus.emit("audio-mute-change", soundEnabled)
  }, [soundEnabled])

  useEffect(() => {
    EventBus.on("current-scene-ready", (scene_instance: Phaser.Scene) => {
      if (currentActiveScene && typeof currentActiveScene === "function") {
        currentActiveScene(scene_instance)
      }

      if (typeof ref === "function") {
        ref({ game: game.current, scene: scene_instance })
      } else if (ref) {
        ref.current = { game: game.current, scene: scene_instance }
      }

      // Signal that the game is loaded and ready
      onGameLoaded()
    })
    return () => {
      EventBus.removeListener("current-scene-ready")
    }
  }, [currentActiveScene, ref, onGameLoaded])

  useEffect(() => {
    EventBus.on("chats-container-collapse", (value: boolean) => {
      setIsChatContainerCollapsed(value)
    })
    return () => {
      EventBus.removeListener("chats-container-collapse")
    }
  }, [setIsChatContainerCollapsed])

  useEffect(() => {
    EventBus.on("chat-collapse", (value: boolean) => {
      setIsChatContainerCollapsed(value)
      setIsChatCollapsed(value)
    })
    return () => {
      EventBus.removeListener("chat-collapse")
    }
  }, [setIsChatContainerCollapsed, setIsChatCollapsed])

  useEffect(() => {
    EventBus.on("set-chatmate", (value: string) => {
      setChatmate(value)
    })
    return () => {
      EventBus.removeListener("set-chatmate")
    }
  }, [setChatmate])

  useEffect(() => {
    EventBus.on("observe-collapse", (value: boolean) => {
      setIsObserveContainerCollapsed(value)
    })
    return () => {
      EventBus.removeListener("observe-collapse")
    }
  }, [setIsObserveContainerCollapsed])

  useEffect(() => {
    EventBus.on("observed-npc", (username: string) => {
      setObservedNPC(username)
    })
    return () => {
      EventBus.removeListener("observed-npc")
    }
  }, [setObservedNPC])

  useEffect(() => {
    EventBus.emit("input-enabled", isChatContainerCollapsed)
  }, [isChatContainerCollapsed])

  return <div id="game-container"></div>
})
