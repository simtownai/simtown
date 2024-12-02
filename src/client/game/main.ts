import { MapConfig, PlayerSpriteDefinition } from "../../shared/types"
import { Game } from "./scenes/Game"
import { LoadingScene } from "./scenes/LoadingScene"
import { Socket } from "socket.io-client"

function getRenderer(): number {
  try {
    const canvas = document.createElement("canvas")
    const gl = canvas.getContext("webgl")
    if (!gl) return Phaser.CANVAS

    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    console.log("WebGL Max Texture Size:", maxTextureSize)
    return maxTextureSize >= 6000 ? Phaser.AUTO : Phaser.CANVAS
  } catch {
    return Phaser.CANVAS
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: getRenderer(),
  parent: "game-container",
  width: "100%",
  height: "100%",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
    },
  },
  scene: [],
  audio: {
    disableWebAudio: false,
  },
  pixelArt: true,
  autoRound: true,
  autoFocus: true,
  roundPixels: true,
  disableContextMenu: true,
  backgroundColor: "#6c4a2b",
}

const StartGame = (
  parent: string,
  socket: Socket,
  mapConfig: MapConfig,
  username: string,
  spriteDefinition: PlayerSpriteDefinition,
  roomId: string,
) => {
  const gameConfig = {
    ...config,
    parent,
    scene: [new LoadingScene(mapConfig), new Game(socket, mapConfig, username, spriteDefinition, roomId)],
  }
  return new Phaser.Game(gameConfig)
}

export default StartGame
