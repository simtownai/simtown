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
    // Get the game's dimensions
    const gameWidth = this.game.scale.width
    const gameHeight = this.game.scale.height

    // Add loading text with proper positioning and bounds
    this.loadingText = this.add
      .text(gameWidth / 2, gameHeight / 2, "Loading...", {
        color: "#ffffff",
        wordWrap: { width: gameWidth * 0.8 },
        align: "center",
      })
      .setOrigin(0.5)
      .setScrollFactor(0) // Make text stay fixed on screen
      .setDepth(1000) // Ensure it's above other elements

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

    // Update loading progress with bounded text
    this.load.on("progress", (value: number) => {
      const progressText = `Loading: ${Math.floor(value * 100)}%`
      this.loadingText.setText(progressText)

      // Ensure text stays centered if size changes
      this.loadingText.setPosition(gameWidth / 2, gameHeight / 2)
    })
  }

  create() {
    // Remove loading text
    this.loadingText.destroy()

    this.spriteHandler = new SpriteHandler(this)
    this.spriteHandler.createAnimations()
    this.spriteHandler.createPlayerAnimations(this.username, this.spriteDefinition)

    // Get the game's actual dimensions from the parent container
    const gameWidth = this.game.scale.width
    const gameHeight = this.game.scale.height

    // Create and position the preview sprite
    this.previewSprite = this.add.sprite(gameWidth / 2, gameHeight / 2, `${this.username}-idle-down-frame0`)

    // Set the sprite's origin to its center
    this.previewSprite.setOrigin(0.5, 0.5)

    // Set scale
    this.previewSprite.setScale(2.2)

    // Play the idle animation
    this.previewSprite.play(`${this.username}-idle-down`)

    // Reset camera and set bounds
    this.cameras.main.setScroll(0, 0)
    this.cameras.main.setBounds(0, 0, gameWidth, gameHeight)
  }

  // Update the resize method to handle centering during resize
  resize() {
    if (this.previewSprite) {
      const gameWidth = this.game.scale.width
      const gameHeight = this.game.scale.height

      // Update sprite position
      this.previewSprite.setPosition(gameWidth / 2, gameHeight / 2)

      // Update camera bounds
      this.cameras.main.setBounds(0, 0, gameWidth, gameHeight)

      // Update loading text position if it exists
      if (this.loadingText && this.loadingText.active) {
        this.loadingText.setPosition(gameWidth / 2, gameHeight / 2)
        this.loadingText.setWordWrapWidth(gameWidth * 0.8)
      }
    }
  }
}
