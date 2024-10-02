export class PixelPerfectSprite extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame)
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta)

    // Round the position before rendering without affecting physics calculations
    this.x = Math.round(this.x)
    this.y = Math.round(this.y)
  }
}
