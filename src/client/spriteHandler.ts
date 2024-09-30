import { CONFIG } from "../shared/config"
import { spriteTypes } from "../shared/types"
import Phaser from "phaser"

export class SpriteHandler {
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  preloadSprites() {
    this.scene.load.spritesheet("orc-idle", "assets/sprites/Orc/Orc/Orc-Idle.png", {
      frameWidth: CONFIG.SPRITE_WIDTH,
      frameHeight: CONFIG.SPRITE_WIDTH,
    })
    this.scene.load.spritesheet("orc-walk", "assets/sprites/Orc/Orc/Orc-Walk.png", {
      frameWidth: CONFIG.SPRITE_WIDTH,
      frameHeight: CONFIG.SPRITE_WIDTH,
    })
    this.scene.load.spritesheet("orc-attack1", "assets/sprites/Orc/Orc/Orc-Attack01.png", {
      frameWidth: CONFIG.SPRITE_WIDTH,
      frameHeight: CONFIG.SPRITE_WIDTH,
    })
    this.scene.load.spritesheet("orc-attack2", "assets/sprites/Orc/Orc/Orc-Attack02.png", {
      frameWidth: CONFIG.SPRITE_WIDTH,
      frameHeight: CONFIG.SPRITE_WIDTH,
    })
    this.scene.load.spritesheet("orc-hurt", "assets/sprites/Orc/Orc/Orc-Hurt.png", {
      frameWidth: CONFIG.SPRITE_WIDTH,
      frameHeight: CONFIG.SPRITE_WIDTH,
    })
    this.scene.load.spritesheet("orc-death", "assets/sprites/Orc/Orc/Orc-Death.png", {
      frameWidth: CONFIG.SPRITE_WIDTH,
      frameHeight: CONFIG.SPRITE_WIDTH,
    })

    this.scene.load.spritesheet("soldier-idle", "assets/sprites/Soldier/Soldier/Soldier-Idle.png", {
      frameWidth: CONFIG.SPRITE_WIDTH,
      frameHeight: CONFIG.SPRITE_WIDTH,
    })
    this.scene.load.spritesheet("soldier-walk", "assets/sprites/Soldier/Soldier/Soldier-Walk.png", {
      frameWidth: CONFIG.SPRITE_WIDTH,
      frameHeight: CONFIG.SPRITE_WIDTH,
    })
    this.scene.load.spritesheet("soldier-attack1", "assets/sprites/Soldier/Soldier/Soldier-Attack01.png", {
      frameWidth: CONFIG.SPRITE_WIDTH,
      frameHeight: CONFIG.SPRITE_WIDTH,
    })
    this.scene.load.spritesheet("soldier-attack2", "assets/sprites/Soldier/Soldier/Soldier-Attack02.png", {
      frameWidth: CONFIG.SPRITE_WIDTH,
      frameHeight: CONFIG.SPRITE_WIDTH,
    })
    this.scene.load.spritesheet("soldier-attack3", "assets/sprites/Soldier/Soldier/Soldier-Attack03.png", {
      frameWidth: CONFIG.SPRITE_WIDTH,
      frameHeight: CONFIG.SPRITE_WIDTH,
    })
    this.scene.load.spritesheet("soldier-hurt", "assets/sprites/Soldier/Soldier/Soldier-Hurt.png", {
      frameWidth: CONFIG.SPRITE_WIDTH,
      frameHeight: CONFIG.SPRITE_WIDTH,
    })
    this.scene.load.spritesheet("soldier-death", "assets/sprites/Soldier/Soldier/Soldier-Death.png", {
      frameWidth: CONFIG.SPRITE_WIDTH,
      frameHeight: CONFIG.SPRITE_WIDTH,
    })
  }

  createAnimations() {
    const createAnimsForCharacter = (prefix: string) => {
      this.scene.anims.create({
        key: `${prefix}-idle`,
        frames: this.scene.anims.generateFrameNumbers(`${prefix}-idle`, { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1,
      })
      this.scene.anims.create({
        key: `${prefix}-walk`,
        frames: this.scene.anims.generateFrameNumbers(`${prefix}-walk`, { start: 0, end: 7 }),
        frameRate: 20,
        repeat: -1,
      })
      this.scene.anims.create({
        key: `${prefix}-attack1`,
        frames: this.scene.anims.generateFrameNumbers(`${prefix}-attack1`, { start: 0, end: 5 }),
        frameRate: 10,
        repeat: 0,
      })
      this.scene.anims.create({
        key: `${prefix}-attack2`,
        frames: this.scene.anims.generateFrameNumbers(`${prefix}-attack2`, { start: 0, end: 5 }),
        frameRate: 10,
        repeat: 0,
      })
      this.scene.anims.create({
        key: `${prefix}-hurt`,
        frames: this.scene.anims.generateFrameNumbers(`${prefix}-hurt`, { start: 0, end: 3 }),
        frameRate: 10,
        repeat: 0,
      })
      this.scene.anims.create({
        key: `${prefix}-death`,
        frames: this.scene.anims.generateFrameNumbers(`${prefix}-death`, { start: 0, end: 3 }),
        frameRate: 10,
        repeat: 0,
      })

      if (prefix === "soldier") {
        this.scene.anims.create({
          key: `${prefix}-attack3`,
          frames: this.scene.anims.generateFrameNumbers(`${prefix}-attack3`, { start: 0, end: 8 }),
          frameRate: 10,
          repeat: 0,
        })
      }
    }

    for (const spriteType of spriteTypes) {
      createAnimsForCharacter(spriteType)
    }
  }

  setupPlayer(player: Phaser.Physics.Arcade.Sprite, spriteType: string) {
    player.setScale(1) // This will make the 16x16 character 32x32 pixels
    player.body!.setSize(CONFIG.SPRITE_CHARACTER_WIDTH, CONFIG.SPRITE_CHARACTER_WIDTH)
    player.body!.setOffset(
      CONFIG.SPRITE_WIDTH / 2 - CONFIG.SPRITE_CHARACTER_WIDTH / 2,
      CONFIG.SPRITE_WIDTH / 2 - CONFIG.SPRITE_CHARACTER_WIDTH / 2,
    )
    player.anims.play(`${spriteType}-idle`)
  }
}
