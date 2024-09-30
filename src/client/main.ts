import { CONFIG } from "../shared/config"
import { PlayerData, SpriteType } from "../shared/types"
import { SpriteHandler } from "./spriteHandler"
import "./style.css"
import Phaser from "phaser"
import { Socket, io } from "socket.io-client"

class MainScene extends Phaser.Scene {
  private socket: Socket
  private map!: Phaser.Tilemaps.Tilemap
  private collisionLayer!: Phaser.Tilemaps.TilemapLayer
  private player!: Phaser.Physics.Arcade.Sprite
  private playerSpriteType: SpriteType
  private spriteHandler!: SpriteHandler
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
    SPACE: Phaser.Input.Keyboard.Key
  }
  private lastSentPlayerData: PlayerData | null = null

  private isAttacking: boolean = false

  constructor() {
    super({ key: "MainScene" })
    this.socket = io(CONFIG.SERVER_URL, { autoConnect: false })
  }

  preload() {
    this.load.tilemapTiledJSON("map", "assets/maps/simple-map.json")
    this.load.image("tiles", "assets/tiles/cute-fantasy-rpg-free.png")
    this.spriteHandler = new SpriteHandler(this)
    this.spriteHandler.preloadSprites()
  }

  create() {
    this.setupMap()
    this.spriteHandler.createAnimations()
    this.setupInput()
    this.setupSocketListeners()
    this.socket.connect()
    this.scale.on("resize", this.resize, this)
  }

  private setupMap() {
    this.map = this.make.tilemap({ key: "map" })
    const tileset = this.map.addTilesetImage("cute-fantasy-rpg-free", "tiles")!
    this.map.createLayer("Grass", tileset)!
    this.map.createLayer("Road and water", tileset)!
    this.map.createLayer("Objects", tileset)!
    this.collisionLayer = this.map.createLayer("Collisions", tileset)!
    this.collisionLayer.setCollisionByExclusion([-1])
    this.collisionLayer.setVisible(false)
  }

  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,H,J,K,L,SPACE") as {
      W: Phaser.Input.Keyboard.Key
      A: Phaser.Input.Keyboard.Key
      S: Phaser.Input.Keyboard.Key
      D: Phaser.Input.Keyboard.Key
      H: Phaser.Input.Keyboard.Key
      J: Phaser.Input.Keyboard.Key
      K: Phaser.Input.Keyboard.Key
      L: Phaser.Input.Keyboard.Key
      SPACE: Phaser.Input.Keyboard.Key
    }
  }

  private setupPlayer(playerInfo: PlayerData) {
    this.playerSpriteType = playerInfo.spriteType
    this.player = this.physics.add.sprite(playerInfo.x, playerInfo.y, `${this.playerSpriteType}-idle`)
    this.player.setCollideWorldBounds(true)
    this.physics.add.collider(this.player, this.collisionLayer)
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09)
    this.spriteHandler.setupPlayer(this.player, this.playerSpriteType)
    this.resize(this.scale.gameSize)

    this.player.on(
      "animationcomplete",
      (animation: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        if (animation.key === `${this.playerSpriteType}-attack1`) {
          this.isAttacking = false
        }
      },
    )
  }

  update() {
    if (!this.player) return

    if (this.isAttacking) {
      this.player.setVelocity(0, 0)
    } else {
      let dx = 0
      let dy = 0

      if (this.cursors.left.isDown || this.keys.A.isDown || this.keys.H.isDown) {
        dx = -1
        this.player.setFlipX(true)
      } else if (this.cursors.right.isDown || this.keys.D.isDown || this.keys.L.isDown) {
        dx = 1
        this.player.setFlipX(false)
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

      let animation = `${this.playerSpriteType}-idle`
      if (dx !== 0 || dy !== 0) {
        animation = `${this.playerSpriteType}-walk`
      }

      if (this.player.anims.getName() !== animation) {
        this.player.anims.play(animation, true)
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && !this.isAttacking) {
      this.isAttacking = true
      const attackAnimation = `${this.playerSpriteType}-attack1`
      this.player.setVelocity(0, 0) // Stop movement during attack
      this.player.anims.play(attackAnimation, true)
    }

    const currentPlayerData: PlayerData = {
      id: this.socket.id!,
      spriteType: this.playerSpriteType,
      x: this.player.x,
      y: this.player.y,
      animation: this.player.anims.getName(),
      flipX: this.player.flipX,
    }

    if (
      !this.lastSentPlayerData ||
      this.lastSentPlayerData.x !== currentPlayerData.x ||
      this.lastSentPlayerData.y !== currentPlayerData.y ||
      this.lastSentPlayerData.animation !== currentPlayerData.animation ||
      this.lastSentPlayerData.flipX !== currentPlayerData.flipX
    ) {
      this.socket.emit("updatePlayerData", currentPlayerData)
      this.lastSentPlayerData = { ...currentPlayerData }
    }
  }

  private setupSocketListeners() {
    this.socket.on("existingPlayers", (players: PlayerData[]) => {
      console.log("Received existing players:", players)
      players.forEach((player) => {
        if (player.id === this.socket.id) {
          this.setupPlayer(player)
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

    this.socket.on("playerDataChanged", (player: PlayerData) => {
      const otherPlayer = this.otherPlayers.get(player.id)
      if (otherPlayer) {
        otherPlayer.setPosition(player.x, player.y)
        otherPlayer.setFlipX(player.flipX)
        otherPlayer.anims.play(player.animation, true)
      }
    })

    this.socket.on("positionRejected", (correctPosition: PlayerData) => {
      this.player.setPosition(correctPosition.x, correctPosition.y)
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
    const otherPlayer = this.physics.add.sprite(playerInfo.x, playerInfo.y, `${playerInfo.spriteType}-idle`)
    this.spriteHandler.setupPlayer(otherPlayer, playerInfo.spriteType)

    otherPlayer.setFlipX(playerInfo.flipX)
    otherPlayer.anims.play(playerInfo.animation)
    this.otherPlayers.set(playerInfo.id, otherPlayer)
  }

  resize(gameSize: Phaser.Structs.Size) {
    const width = gameSize.width
    const height = gameSize.height

    this.cameras.main.setViewport(0, 0, width, height)
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
    if (this.player) {
      this.cameras.main.centerOn(this.player.x, this.player.y)
    }
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: "100%",
  height: "100%",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
    },
  },
  scene: [MainScene],
  audio: {
    disableWebAudio: false,
  },
  pixelArt: true,
  autoRound: true,
  autoFocus: true,
}

new Phaser.Game(config)
