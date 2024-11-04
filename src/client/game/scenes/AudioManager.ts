import { EventBus } from "../EventBus"

export class AudioManager {
  private scene: Phaser.Scene
  private bgMusic: Phaser.Sound.BaseSound | null = null
  private soundEnabled: boolean

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.soundEnabled = localStorage.getItem("soundEnabled") === "true"
    this.setupAudioListeners()
  }

  private setupAudioListeners() {
    EventBus.on("audio-mute-change", this.handleMuteChange.bind(this))
  }

  public startBackgroundMusic() {
    if (this.bgMusic) {
      if (this.soundEnabled && this.bgMusic.isPaused) {
        this.bgMusic.resume()
      }
      return
    }

    this.bgMusic = this.scene.sound.add("background-music", {
      volume: 0.3,
      loop: true,
    })

    if (this.soundEnabled) {
      this.bgMusic.play()
    }
  }

  private handleMuteChange(soundEnabled: boolean) {
    this.soundEnabled = soundEnabled
    localStorage.setItem("soundEnabled", soundEnabled.toString())

    if (this.bgMusic) {
      if (soundEnabled) {
        if (this.bgMusic.isPaused) {
          this.bgMusic.resume()
        } else if (!this.bgMusic.isPlaying) {
          this.bgMusic.play()
        }
      } else {
        this.bgMusic.pause()
      }
    }
  }

  public destroy() {
    if (this.bgMusic) {
      this.bgMusic.destroy()
    }
    EventBus.off("audio-mute-change", this.handleMuteChange.bind(this))
  }
}
