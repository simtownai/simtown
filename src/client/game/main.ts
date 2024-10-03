import { Game } from "./scenes/Game"
import { Socket } from "socket.io-client"

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
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
}

const StartGame = (parent: string, socket: Socket) => {
  const gameConfig = { ...config, parent, scene: [new Game(socket)] }
  return new Phaser.Game(gameConfig)
}

export default StartGame
