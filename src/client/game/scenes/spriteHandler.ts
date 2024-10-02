import { CONFIG } from "../../../shared/config"
import { SpriteType } from "../../../shared/types"

const animationsConfig: { [key in SpriteType]?: string[] } = {
  Archer: ["Attack01", "Attack02", "Death", "Hurt", "Idle", "Walk"],
  "Armored Axeman": ["Attack01", "Attack02", "Attack03", "Death", "Hurt", "Idle", "Walk"],
  "Armored Orc": ["Attack01", "Attack02", "Attack03", "Block", "Death", "Hurt", "Idle", "Walk"],
  "Armored Skeleton": ["Attack01", "Attack02", "Death", "Hurt", "Idle", "Walk"],
  "Elite Orc": ["Attack01", "Attack02", "Attack03", "Death", "Hurt", "Idle", "Walk"],
  Knight: ["Attack01", "Attack02", "Attack03", "Block", "Death", "Hurt", "Idle", "Walk"],
  "Knight Templar": ["Attack01", "Attack02", "Attack03", "Block", "Death", "Hurt", "Idle", "Walk01", "Walk02"],
  Lancer: ["Attack01", "Attack02", "Attack03", "Death", "Hurt", "Idle", "Walk01", "Walk02"],
  Orc: ["Attack01", "Attack02", "Death", "Hurt", "Idle", "Walk"],
  "Orc rider": ["Attack01", "Attack02", "Attack03", "Block", "Death", "Hurt", "Idle", "Walk"],
  Priest: ["Attack", "Death", "Heal", "Hurt", "Idle", "Walk"],
  Skeleton: ["Attack01", "Attack02", "Block", "Death", "Hurt", "Idle", "Walk"],
  "Skeleton Archer": ["Attack", "Death", "Hurt", "Idle", "Walk"],
  Slime: ["Attack01", "Attack02", "Death", "Hurt", "Idle", "Walk"],
  Soldier: ["Attack01", "Attack02", "Attack03", "Death", "Hurt", "Idle", "Walk"],
  Swordsman: ["Attack01", "Attack02", "Attack3", "Death", "Hurt", "Idle", "Walk"],
  Werebear: ["Attack01", "Attack02", "Attack03", "Death", "Hurt", "Idle", "Walk"],
  Werewolf: ["Attack01", "Attack02", "Death", "Hurt", "Idle", "Walk"],
  Wizard: ["Attack01", "Attack02", "DEATH", "Hurt", "Idle", "Walk"],
}

export class SpriteHandler {
  private scene: Phaser.Scene
  private spriteInfo: { [key in SpriteType]?: Set<string> } = {}

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  preloadSprites() {
    Object.entries(animationsConfig).forEach(([spriteType, availableAnimations]) => {
      const basePath = `assets/sprites/Tiny RPG Character Asset Pack v1.03 -Full 20 Characters/Characters(100x100)/${spriteType}/${spriteType}/${spriteType}`

      availableAnimations.forEach((animation) => {
        const animationName = `${spriteType}-${animation.toLowerCase()}`
        const path = `${basePath}-${animation}.png`

        this.scene.load.spritesheet(animationName, path, {
          frameWidth: CONFIG.SPRITE_WIDTH,
          frameHeight: CONFIG.SPRITE_WIDTH,
        })

        this.scene.load.on(`filecomplete-spritesheet-${animationName}`, () => {
          if (!this.spriteInfo[spriteType]) {
            this.spriteInfo[spriteType] = new Set<string>()
          }
          this.spriteInfo[spriteType]!.add(animation.toLowerCase())
        })
      })
      this.scene.load.spritesheet("speech-bubble", "assets/sprites/speech_bubble_animation-11x11.png", {
        frameWidth: 11,
        frameHeight: 11,
      })
    })
  }

  createAnimations() {
    Object.entries(this.spriteInfo).forEach(([spriteType, animations]) => {
      this.createAnimationForCharacter(spriteType as SpriteType, animations!)
    })

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

  private createAnimationForCharacter(spriteType: SpriteType, animations: Set<string>) {
    animations.forEach((animation) => {
      let animationFinal = animation

      if (animation === "walk02") {
        return
      }
      if (animation === "walk01") {
        animationFinal = "walk"
      } else if (animation === "attack" || animation === "attack01") {
        animationFinal = "attack1"
      } else if (animation === "attack02") {
        animationFinal = "attack2"
      } else if (animation === "attack03" || animation === "attack3") {
        animationFinal = "attack3"
      }

      this.createAnimation(
        spriteType,
        animationFinal,
        `${spriteType}-${animation}`,
        animation.toLowerCase().startsWith("walk") ? 20 : 10,
        animation.toLowerCase().startsWith("idle") || animation.toLowerCase().startsWith("walk") ? -1 : 0,
      )
    })
  }

  private createAnimation(
    spriteType: SpriteType,
    animation: string,
    spritesheet: string,
    frameRate: number,
    repeat: number,
  ) {
    const texture = this.scene.textures.get(spritesheet)
    if (texture) {
      const frameCount = texture.frameTotal - 1

      this.scene.anims.create({
        key: `${spriteType}-${animation}`,
        frames: this.scene.anims.generateFrameNumbers(spritesheet, { start: 0, end: frameCount - 1 }),
        frameRate,
        repeat,
      })
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

  public setupPlayer(player: Phaser.Physics.Arcade.Sprite, spriteType: SpriteType) {
    player.setScale(1)
    player.body!.setSize(CONFIG.SPRITE_CHARACTER_WIDTH, CONFIG.SPRITE_CHARACTER_WIDTH)
    player.body!.setOffset(
      CONFIG.SPRITE_WIDTH / 2 - CONFIG.SPRITE_CHARACTER_WIDTH / 2,
      CONFIG.SPRITE_WIDTH / 2 - CONFIG.SPRITE_CHARACTER_WIDTH / 2,
    )
    player.anims.play(`${spriteType}-idle`)
  }
}
