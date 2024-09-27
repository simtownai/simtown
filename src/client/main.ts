import { CONFIG } from "../shared/config"
import { PlayerData } from "../shared/types"
import Phaser from "phaser"
import { Socket, io } from "socket.io-client"

class MainScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap
  private socket: Socket
  private player!: Phaser.Physics.Arcade.Sprite
  private otherPlayers: Map<string, Phaser.Physics.Arcade.Sprite> = new Map()
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keys: {
    W: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
    H: Phaser.Input.Keyboard.Key
    J: Phaser.Input.Keyboard.Key
    K: Phaser.Input.Keyboard.Key
    L: Phaser.Input.Keyboard.Key
  }
  private playerSpriteIndex: number = 0

  constructor() {
    super({ key: "MainScene" })
    this.socket = io(CONFIG.SERVER_URL, { autoConnect: false })
  }

  preload() {
    this.load.image("tiles", "assets/tileset.png")
    this.load.tilemapTiledJSON("map", "assets/map.json")
    this.load.spritesheet("characters", "assets/characters.png", { frameWidth: 32, frameHeight: 32 })
  }

  create() {
    this.setupMap()
    this.setupPlayer()
    this.setupCamera()
    this.setupInput()
    this.setupFullscreenButton()
    this.setupAnimations()
    this.setupSocketListeners()
    this.socket.connect()
  }

  private setupMap() {
    this.map = this.make.tilemap({ key: "map" })
    const tileset = this.map.addTilesetImage("tileset", "tiles")!
    this.map.createLayer("Ground", tileset)
    this.map.createLayer("Objects", tileset)!
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
  }

  private setupPlayer() {
    // We'll initialize the player sprite here, but we won't set its position yet
    // The actual position will be set when we receive the "existingPlayers" event
    const startFrame = 0 // We'll update this when we get the player's spriteIndex
    this.player = this.physics.add.sprite(0, 0, "characters", startFrame)
    this.player.setCollideWorldBounds(true)
    this.player.setVisible(false) // Hide the player until we get its position
  }

  private setupCamera() {
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
    // We'll start following the player when we set its position
  }

  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,H,J,K,L") as {
      W: Phaser.Input.Keyboard.Key
      A: Phaser.Input.Keyboard.Key
      S: Phaser.Input.Keyboard.Key
      D: Phaser.Input.Keyboard.Key
      H: Phaser.Input.Keyboard.Key
      J: Phaser.Input.Keyboard.Key
      K: Phaser.Input.Keyboard.Key
      L: Phaser.Input.Keyboard.Key
    }
  }

  private setupFullscreenButton() {
    const fullscreenButton = this.add
      .text(10, 10, "Fullscreen", { backgroundColor: "#000" })
      .setInteractive()
      .on("pointerdown", () => {
        if (this.scale.isFullscreen) {
          this.scale.stopFullscreen()
        } else {
          this.scale.startFullscreen()
        }
      })
    fullscreenButton.setScrollFactor(0)
  }

  private setupAnimations() {
    const createAnimForSprite = (spriteIndex: number) => {
      const col = spriteIndex % 4
      const row = Math.floor(spriteIndex / 4)

      const CHARACTERS_PER_ROW = 4
      const FRAMES_PER_CHARACTER = 3
      const DIRECTIONS = 4 // down, left, right, up
      const FRAMES_PER_ROW = CHARACTERS_PER_ROW * FRAMES_PER_CHARACTER * DIRECTIONS

      const baseFrame = row * FRAMES_PER_ROW + col * FRAMES_PER_CHARACTER

      this.anims.create({
        key: `idle-${spriteIndex}`,
        frames: [{ key: "characters", frame: baseFrame + 1 }],
        frameRate: 10,
        repeat: -1,
      })

      this.anims.create({
        key: `down-${spriteIndex}`,
        frames: this.anims.generateFrameNumbers("characters", { frames: [baseFrame, baseFrame + 1, baseFrame + 2] }),
        frameRate: 10,
        repeat: -1,
      })
      this.anims.create({
        key: `left-${spriteIndex}`,
        frames: this.anims.generateFrameNumbers("characters", {
          frames: [baseFrame + 12, baseFrame + 13, baseFrame + 14],
        }),
        frameRate: 10,
        repeat: -1,
      })
      this.anims.create({
        key: `right-${spriteIndex}`,
        frames: this.anims.generateFrameNumbers("characters", {
          frames: [baseFrame + 24, baseFrame + 25, baseFrame + 26],
        }),
        frameRate: 10,
        repeat: -1,
      })
      this.anims.create({
        key: `up-${spriteIndex}`,
        frames: this.anims.generateFrameNumbers("characters", {
          frames: [baseFrame + 36, baseFrame + 37, baseFrame + 38],
        }),
        frameRate: 10,
        repeat: -1,
      })
    }

    for (let i = 0; i < 8; i++) {
      createAnimForSprite(i)
    }
  }

  resize() {
    const { width, height } = this.scale
    this.cameras.main.setViewport(0, 0, width, height)
  }

  update() {
    let dx = 0
    let dy = 0

    if (this.cursors.left.isDown || this.keys.A.isDown || this.keys.H.isDown) {
      dx = -1
    } else if (this.cursors.right.isDown || this.keys.D.isDown || this.keys.L.isDown) {
      dx = 1
    }

    if (this.cursors.up.isDown || this.keys.W.isDown || this.keys.K.isDown) {
      dy = -1
    } else if (this.cursors.down.isDown || this.keys.S.isDown || this.keys.J.isDown) {
      dy = 1
    }

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2
      dy *= Math.SQRT1_2
    }

    const speed = 160
    this.player.setVelocity(dx * speed, dy * speed)

    let animation = `idle-${this.playerSpriteIndex}`
    if (dx < 0) {
      animation = `left-${this.playerSpriteIndex}`
    } else if (dx > 0) {
      animation = `right-${this.playerSpriteIndex}`
    } else if (dy < 0) {
      animation = `up-${this.playerSpriteIndex}`
    } else if (dy > 0) {
      animation = `down-${this.playerSpriteIndex}`
    }

    // Play animation
    if (animation !== `idle-${this.playerSpriteIndex}`) {
      this.player.anims.play(animation, true)
    } else {
      this.player.anims.stop()
    }

    // Emit position and animation
    this.socket.emit("updatePosition", {
      id: this.socket.id,
      x: this.player.x,
      y: this.player.y,
      animation: animation,
      spriteIndex: this.playerSpriteIndex,
    })
  }

  private setupSocketListeners() {
    this.socket.on("existingPlayers", (players: PlayerData[]) => {
      console.log("Received existing players:", players)
      players.forEach((player) => {
        if (player.id === this.socket.id) {
          this.playerSpriteIndex = player.spriteIndex
          const startFrame = this.playerSpriteIndex * 12 // Each character has 12 frames (3 for each direction)
          this.player = this.physics.add.sprite(player.x, player.y, "characters", startFrame)
          this.player.setCollideWorldBounds(true)
          this.cameras.main.startFollow(this.player, true, 0.09, 0.09)

          // Set the initial animation
          this.player.anims.play(`idle-${this.playerSpriteIndex}`)
        } else {
          this.addOtherPlayer(player)
        }
      })
    })

    this.socket.on("playerJoined", (player: PlayerData) => {
      console.log("Player joined:", player)
      if (player.id !== this.socket.id) {
        this.addOtherPlayer(player)
      }
    })

    this.socket.on("playerMoved", (player: PlayerData) => {
      const otherPlayer = this.otherPlayers.get(player.id)
      if (otherPlayer) {
        otherPlayer.setPosition(player.x, player.y)
        if (player.animation !== `idle-${player.spriteIndex}`) {
          otherPlayer.anims.play(player.animation, true)
        } else {
          otherPlayer.anims.stop()
        }
      }
    })

    this.socket.on("playerLeft", (playerId: string) => {
      const otherPlayer = this.otherPlayers.get(playerId)
      if (otherPlayer) {
        otherPlayer.destroy()
        this.otherPlayers.delete(playerId)
      }
    })
  }

  private addOtherPlayer(playerInfo: PlayerData) {
    const startFrame = playerInfo.spriteIndex * 12
    const otherPlayer = this.physics.add.sprite(playerInfo.x, playerInfo.y, "characters", startFrame)
    otherPlayer.anims.play(`idle-${playerInfo.spriteIndex}`)
    this.otherPlayers.set(playerInfo.id, otherPlayer)
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
    },
  },
  scene: [MainScene],
}

new Phaser.Game(config)
