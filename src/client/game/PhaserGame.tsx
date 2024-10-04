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
  currentActiveScene?: (scene_instance: Phaser.Scene) => void
  isChatContainerCollapsed: boolean
  setIsChatContainerCollapsed: (value: boolean) => void
  setIsChatCollapsed: (value: boolean) => void
  setChatmate: (value: string) => void
}

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(function PhaserGame(
  {
    socket,
    currentActiveScene,
    isChatContainerCollapsed,
    setIsChatContainerCollapsed,
    setIsChatCollapsed,
    setChatmate,
  },
  ref,
) {
  const game = useRef<Phaser.Game | null>(null!)

  useLayoutEffect(() => {
    if (game.current === null) {
      game.current = StartGame("game-container", socket)

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
    EventBus.on("current-scene-ready", (scene_instance: Phaser.Scene) => {
      if (currentActiveScene && typeof currentActiveScene === "function") {
        currentActiveScene(scene_instance)
      }

      if (typeof ref === "function") {
        ref({ game: game.current, scene: scene_instance })
      } else if (ref) {
        ref.current = { game: game.current, scene: scene_instance }
      }
    })
    return () => {
      EventBus.removeListener("current-scene-ready")
    }
  }, [currentActiveScene, ref])

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
    EventBus.emit("input-enabled", isChatContainerCollapsed)
  }, [isChatContainerCollapsed])

  return <div id="game-container"></div>
})
