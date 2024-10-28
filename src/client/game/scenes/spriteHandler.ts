import { CONFIG } from "../../../shared/config"
import { PlayerSpriteDefinition } from "../../../shared/types"

export class SpriteHandler {
  private scene: Phaser.Scene
  private nSpritesPerRow: number = 56

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  preloadSprites() {
    this.scene.load.spritesheet("speech-bubble", "assets/sprites/speech_bubble_animation-11x11.png", {
      frameWidth: 11,
      frameHeight: 11,
    })

    const manifest = this.scene.cache.json.get("componentManifest")

    Object.keys(manifest).forEach((component: string) => {
      const filenames = manifest[component]

      filenames.forEach((filename: string) => {
        const path = `assets/sprites/Character_Generator/${component}/16x16/${filename}.png`
        this.scene.load.spritesheet(filename, path, {
          frameWidth: CONFIG.SPRITE_WIDTH,
          frameHeight: CONFIG.SPRITE_HEIGHT,
        })
      })
    })
  }

  public createAnimations() {
    this.scene.anims.create({
      key: "speech-bubble-animation",
      frames: this.scene.anims.generateFrameNumbers("speech-bubble", { start: 0, end: 7 }),
      frameRate: 30,
      repeat: 0,
    })

    this.scene.anims.create({
      key: "speech-bubble-animation-reverse",
      frames: this.scene.anims.generateFrameNumbers("speech-bubble", { start: 7, end: 0, first: 7 }),
      frameRate: 30,
      repeat: 0,
    })
  }

  public createPlayerAnimations(username: string, spriteDefinition: PlayerSpriteDefinition) {
    const directions = ["right", "up", "left", "down"]

    const animations = [
      { keySuffix: "idle", row: 1, frameCount: 6, frameRate: 10, repeat: -1 },
      { keySuffix: "walk", row: 2, frameCount: 6, frameRate: 10, repeat: -1 },
      { keySuffix: "attack", row: 13, frameCount: 6, frameRate: 10, repeat: 0 },
      { keySuffix: "read", row: 7, frameCount: 12, frameRate: 10, repeat: -1, isDirectional: false },
    ]

    for (const anim of animations) {
      const { keySuffix, row, frameCount, frameRate, repeat, isDirectional = true } = anim

      if (isDirectional) {
        // Handle directional animations (idle, walk, attack)
        for (const [directionIndex, direction] of directions.entries()) {
          const frames = []
          for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
            const frameNumber = row * this.nSpritesPerRow + directionIndex * frameCount + frameIndex
            const textureKey = `${username}-${keySuffix}-${direction}-frame${frameIndex}`

            // Create a canvas texture for the composite frame
            const canvasTexture = this.scene.textures.createCanvas(
              textureKey,
              CONFIG.SPRITE_WIDTH,
              CONFIG.SPRITE_HEIGHT,
            )!
            const canvas = canvasTexture.getSourceImage() as HTMLCanvasElement
            const ctx = canvas.getContext("2d")!

            // Draw each component's frame onto the canvas
            for (const componentKey in spriteDefinition) {
              const componentFilename = spriteDefinition[componentKey as keyof PlayerSpriteDefinition]
              if (!componentFilename) continue

              const componentFrame = this.scene.textures.getFrame(componentFilename, frameNumber)

              if (componentFrame && componentFrame.source.image) {
                ctx.drawImage(
                  componentFrame.source.image as CanvasImageSource,
                  componentFrame.cutX,
                  componentFrame.cutY,
                  CONFIG.SPRITE_COLLISION_BOX_HEIGHT,
                  componentFrame.cutHeight,
                  0,
                  0,
                  CONFIG.SPRITE_COLLISION_BOX_HEIGHT,
                  componentFrame.cutHeight,
                )
              }
            }

            canvasTexture.refresh()
            frames.push({ key: textureKey })
          }

          this.scene.anims.create({
            key: `${username}-${keySuffix}-${direction}`,
            frames: frames,
            frameRate: frameRate,
            repeat: repeat,
          })
        }
      } else {
        // Handle non-directional animations (reading)
        const frames = []
        for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
          const frameNumber = row * this.nSpritesPerRow + frameIndex
          const textureKey = `${username}-${keySuffix}-frame${frameIndex}`

          // Create a canvas texture for the composite frame
          const canvasTexture = this.scene.textures.createCanvas(textureKey, CONFIG.SPRITE_WIDTH, CONFIG.SPRITE_HEIGHT)!
          const canvas = canvasTexture.getSourceImage() as HTMLCanvasElement
          const ctx = canvas.getContext("2d")!

          // Draw each component's frame onto the canvas
          for (const componentKey in spriteDefinition) {
            const componentFilename = spriteDefinition[componentKey as keyof PlayerSpriteDefinition]
            if (!componentFilename) continue

            const componentFrame = this.scene.textures.getFrame(componentFilename, frameNumber)

            if (componentFrame && componentFrame.source.image) {
              ctx.drawImage(
                componentFrame.source.image as CanvasImageSource,
                componentFrame.cutX,
                componentFrame.cutY,
                CONFIG.SPRITE_COLLISION_BOX_HEIGHT,
                componentFrame.cutHeight,
                0,
                0,
                CONFIG.SPRITE_COLLISION_BOX_HEIGHT,
                componentFrame.cutHeight,
              )
            }
          }

          canvasTexture.refresh()
          frames.push({ key: textureKey })
        }

        this.scene.anims.create({
          key: `${username}-${keySuffix}`,
          frames: frames,
          frameRate: frameRate,
          repeat: repeat,
        })
      }
    }
  }

  public createSpeechBubble(): Phaser.GameObjects.Sprite {
    const speechBubble = this.scene.add.sprite(0, 0, "speech-bubble")
    speechBubble.anims.play("speech-bubble-animation")
    speechBubble.setVisible(false)
    speechBubble.setInteractive()
    speechBubble.setScale(1)
    speechBubble.setDepth(1)
    return speechBubble
  }

  public setupPlayer(player: Phaser.Physics.Arcade.Sprite, playerKey: string) {
    player.setScale(1)
    player.body!.setSize(CONFIG.SPRITE_COLLISION_BOX_HEIGHT, CONFIG.SPRITE_COLLISION_BOX_HEIGHT)
    player.body!.setOffset(0, CONFIG.SPRITE_HEIGHT - CONFIG.SPRITE_COLLISION_BOX_HEIGHT)
    player.anims.play(`${playerKey}-idle-down`)
    player.setOrigin(0.5, 1)
  }
}
