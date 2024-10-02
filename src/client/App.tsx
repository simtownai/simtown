import { IRefPhaserGame, PhaserGame } from "./game/PhaserGame"
import React, { useRef, useState } from "react"

function App() {
  const phaserRef = useRef<IRefPhaserGame | null>(null)
  const currentScene = (scene: Phaser.Scene) => {
    console.log(scene)
  }

  return (
    <div id="app">
      <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />
    </div>
  )
}

export default App
