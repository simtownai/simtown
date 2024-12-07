import { CONFIG } from "../../../shared/config"
import { Tables } from "../../../shared/supabase-types"
import { Scene } from "phaser"

export class LoadingScene extends Scene {
  private progressBar!: Phaser.GameObjects.Graphics
  private progressBox!: Phaser.GameObjects.Graphics
  private loadingText!: Phaser.GameObjects.Text
  private percentText!: Phaser.GameObjects.Text
  private assetText!: Phaser.GameObjects.Text

  constructor(private mapConfig: Tables<"map">) {
    super({ key: "LoadingScene" })
  }

  preload() {
    this.cameras.main.setBackgroundColor("#6c4a2b")
    this.createLoadingUI()

    this.load.on("progress", this.updateProgress, this)
    this.load.on("fileprogress", this.updateFileProgress, this)
    this.load.on("complete", this.loadComplete, this)

    this.loadGameAssets()
  }

  private createLoadingUI() {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // Progress bar background
    this.progressBox = this.add.graphics()
    this.progressBox.fillStyle(0x48331c, 0.8)
    this.progressBox.fillRect(width / 4, height / 2 - 30, width / 2, 50)

    // Progress bar
    this.progressBar = this.add.graphics()

    const textConfig = {
      fontFamily: "Monogram Extended",
      fontSize: "32px",
      color: "#ffffff",
      resolution: 1,
    }

    // Loading text
    this.loadingText = this.add.text(width / 2, height / 2 - 70, "Loading...", textConfig)
    this.loadingText.setOrigin(0.5)

    // Percentage text
    this.percentText = this.add.text(width / 2, height / 2 - 5, "0%", textConfig)
    this.percentText.setOrigin(0.5)

    // Asset text
    this.assetText = this.add.text(width / 2, height / 2 + 50, "", textConfig)
    this.assetText.setOrigin(0.5)
  }

  private updateProgress(value: number) {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    this.progressBar.clear()
    this.progressBar.fillStyle(0xe1af74, 1)
    this.progressBar.fillRect(width / 4 + 10, height / 2 - 20, (width / 2 - 20) * value, 30)

    const percent = Math.floor(value * 100)
    this.percentText.setText(`${percent}%`)
  }

  private updateFileProgress(file: { key: string }) {
    let assetName = file.key
    // Clean up asset name for display
    assetName = assetName.replace(/^assets\//, "")
    assetName = assetName.split("/").pop() || assetName
    this.assetText.setText(assetName)
  }

  private loadComplete() {
    this.tweens.add({
      targets: [this.progressBar, this.progressBox, this.loadingText, this.percentText, this.assetText],
      alpha: 0,
      duration: 500,
      onComplete: () => {
        this.load.off("progress", this.updateProgress)
        this.load.off("fileprogress", this.updateFileProgress)
        this.load.off("complete", this.loadComplete)
        this.scene.start("Game")
      },
    })
  }

  private loadGameAssets() {
    this.load.json("componentManifest", "assets/sprites/Character_Generator/componentManifest.json")
    this.load.once("filecomplete-json-componentManifest", () => {
      const manifest = this.cache.json.get("componentManifest")

      Object.keys(manifest).forEach((component: string) => {
        const filenames = manifest[component]
        filenames.forEach((filename: string) => {
          const path = `assets/sprites/Character_Generator/${component}/16x16/${filename}.png`
          this.load.spritesheet(filename, path, {
            frameWidth: CONFIG.SPRITE_WIDTH,
            frameHeight: CONFIG.SPRITE_HEIGHT,
          })
        })
      })
    })

    this.load.tilemapTiledJSON("map", `assets/maps/${this.mapConfig.map_json_filename}.json`)
    this.load.image("tileset", `assets/tiles/${this.mapConfig.tileset_png_filename}.png`)
    this.load.spritesheet("speech-bubble", "assets/sprites/speech_bubble_animation-11x11.png", {
      frameWidth: 11,
      frameHeight: 11,
    })
    this.load.audio("background-music", "assets/audio/medieval-background-music.mp3")
  }
}
