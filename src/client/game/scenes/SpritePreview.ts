import { CONFIG } from "../../../shared/config"
import { PlayerSpriteDefinition } from "../../../shared/types"
import { SpriteHandler } from "./spriteHandler"
import Phaser from "phaser"

export class SpritePreview extends Phaser.Scene {
  private spriteHandler!: SpriteHandler
  private previewSprite!: Phaser.GameObjects.Sprite
  private username: string
  private spriteDefinition: PlayerSpriteDefinition
  private loadingText!: Phaser.GameObjects.Text

  constructor(username: string, spriteDefinition: PlayerSpriteDefinition) {
    super({ key: "SpritePreview" })
    this.username = username
    this.spriteDefinition = spriteDefinition
  }

  preload() {
    // Add loading text
    this.loadingText = this.add
      .text(this.cameras.main.centerX, this.cameras.main.centerY, "Loading...", {
        font: "16px Arial",
        color: "#ffffff",
      })
      .setOrigin(0.5)

    // Load component manifest
    this.load.json("componentManifest", "assets/sprites/Character_Generator/componentManifest.json")

    // Load sprites after manifest is loaded
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

    // Update loading progress
    this.load.on("progress", (value: number) => {
      this.loadingText.setText(`Loading: ${Math.floor(value * 100)}%`)
    })
  }

  create() {
    // Remove loading text
    this.loadingText.destroy()

    this.spriteHandler = new SpriteHandler(this)
    this.spriteHandler.createAnimations()
    this.spriteHandler.createPlayerAnimations(this.username, this.spriteDefinition)

    // Create and position the preview sprite
    this.previewSprite = this.add.sprite(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      `${this.username}-idle-down-frame0`,
    )
    this.previewSprite.setScale(1.5)

    this.previewSprite.play(`${this.username}-idle-down`)

    // Center the camera
    this.cameras.main.setScroll(
      this.cameras.main.centerX - this.cameras.main.width / 2,
      this.cameras.main.centerY - this.cameras.main.height / 2,
    )
  }
}
