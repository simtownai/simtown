import { CONFIG } from "../shared/config"
import { PlayerData, SpriteType } from "../shared/types"
import { PixelPerfectSprite } from "./pixelPerfectSprite"
import { SpriteHandler } from "./spriteHandler"
import "./style.css"
import Phaser from "phaser"
import VirtualJoystick from "phaser3-rex-plugins/plugins/virtualjoystick.js"
import { Socket, io } from "socket.io-client"

interface OtherPlayerData {
  sprite: Phaser.Physics.Arcade.Sprite
  speechBubble: Phaser.GameObjects.Sprite
}

class MainScene extends Phaser.Scene {
  private socket: Socket
  private map!: Phaser.Tilemaps.Tilemap
  private collisionLayer!: Phaser.Tilemaps.TilemapLayer
  private playerSprite!: Phaser.Physics.Arcade.Sprite
  private playerSpriteType: SpriteType
  private spriteHandler!: SpriteHandler
  private otherPlayers: Map<string, OtherPlayerData> = new Map()
  private otherPlayersGroup!: Phaser.Physics.Arcade.Group
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
  private joystick: VirtualJoystick
  private uiCamera!: Phaser.Cameras.Scene2D.Camera
  private gameContainer!: Phaser.GameObjects.Container
  private uiContainer!: Phaser.GameObjects.Container
  private playerContainer!: Phaser.GameObjects.Container
  private otherPlayersContainer!: Phaser.GameObjects.Container

  private touchStartX: number = 0
  private touchStartY: number = 0
  private isTouching: boolean = false
  private touchMoved: boolean = false

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
    this.setupSocketListeners()
    this.socket.connect()
    this.scale.on("resize", this.resize, this)
    this.setupVirtualJoystick()
    this.setupCameras()
    this.setupInput()
  }

  private setupMap() {
    this.gameContainer = this.add.container(0, 0)
    this.uiContainer = this.add.container(0, 0)
    this.playerContainer = this.add.container(0, 0)
    this.otherPlayersContainer = this.add.container(0, 0)

    this.map = this.make.tilemap({ key: "map" })
    const tileset = this.map.addTilesetImage("cute-fantasy-rpg-free", "tiles")!
    const grassLayer = this.map.createLayer("Grass", tileset)!
    const roadLayer = this.map.createLayer("Road and water", tileset)!
    const objects1Layer = this.map.createLayer("Objects1", tileset)!
    const objects2Layer = this.map.createLayer("Objects2", tileset)!
    this.collisionLayer = this.map.createLayer("Collisions", tileset)!
    this.collisionLayer.setCollisionByExclusion([-1])
    this.collisionLayer.setVisible(false)

    this.otherPlayersGroup = this.physics.add.group()

    this.gameContainer.add([grassLayer, roadLayer, objects1Layer, objects2Layer, this.collisionLayer])
    this.gameContainer.add([this.otherPlayersContainer, this.playerContainer])
  }

  private setupCameras() {
    this.cameras.main.setZoom(3)
    this.cameras.main.roundPixels = true

    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)

    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height)
    this.uiCamera.setZoom(1)
    this.uiCamera.setScroll(0, 0)

    this.uiCamera.ignore(this.gameContainer)
    this.cameras.main.ignore(this.uiContainer)
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
    this.input.on("pointerdown", this.onPointerDown, this)
    this.input.on("pointermove", this.onPointerMove, this)
    this.input.on("pointerup", this.onPointerUp, this)
  }

  private setupVirtualJoystick() {
    if (this.sys.game.device.input.touch) {
      console.log("Touch device detected")

      this.joystick = new VirtualJoystick(this, {
        x: 0,
        y: 0,
        radius: 50,
        base: this.add.circle(0, 0, 50, 0x888888).setAlpha(0.5),
        thumb: this.add.circle(0, 0, 25, 0xcccccc).setAlpha(0.7),
        fixed: false,
      })

      this.joystick.setVisible(false)
      this.joystick.setEnable(false)

      this.uiContainer.add([this.joystick.base, this.joystick.thumb])
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.joystick) return

    this.joystick.x = pointer.x
    this.joystick.y = pointer.y

    this.touchStartX = pointer.x
    this.touchStartY = pointer.y
    this.isTouching = true
    this.touchMoved = false
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.isTouching) return

    const distance = Phaser.Math.Distance.Between(this.touchStartX, this.touchStartY, pointer.x, pointer.y)
    const moveThreshold = 10 // pixels
    if (distance >= moveThreshold) {
      if (!this.touchMoved) {
        this.touchMoved = true
        this.joystick.setVisible(true)
        this.joystick.setEnable(true)
      }
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (!this.joystick) return

    if (!this.touchMoved) {
      this.handleTap()
    }
    this.isTouching = false
    this.touchMoved = false

    this.joystick.setVisible(false)
    this.joystick.setEnable(false)
  }

  private handleTap() {
    if (!this.isAttacking) {
      this.isAttacking = true
      const attackAnimation = `${this.playerSpriteType}-attack1`
      this.playerSprite.anims.play(attackAnimation, true)
    }
  }

  private setupPlayer(playerInfo: PlayerData) {
    this.playerSpriteType = playerInfo.spriteType
    this.playerSprite = new PixelPerfectSprite(this, playerInfo.x, playerInfo.y, `${this.playerSpriteType}-idle`)
    this.physics.add.existing(this.playerSprite)
    this.playerSprite.setCollideWorldBounds(true)
    this.physics.add.collider(this.playerSprite, this.collisionLayer)
    this.physics.add.collider(this.playerSprite, this.otherPlayersGroup)
    this.cameras.main.startFollow(this.playerSprite, true, 0.09, 0.09)
    this.spriteHandler.setupPlayer(this.playerSprite, this.playerSpriteType)
    this.resize(this.scale.gameSize)

    this.playerSprite.on(
      "animationcomplete",
      (animation: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        if (animation.key === `${this.playerSpriteType}-attack1`) {
          this.isAttacking = false
        }
      },
    )

    this.playerContainer.add(this.playerSprite)
  }

  private addOtherPlayer(playerInfo: PlayerData) {
    const otherPlayerSprite = new PixelPerfectSprite(this, playerInfo.x, playerInfo.y, `${playerInfo.spriteType}-idle`)
    this.physics.add.existing(otherPlayerSprite)
    this.spriteHandler.setupPlayer(otherPlayerSprite, playerInfo.spriteType)
    otherPlayerSprite.setFlipX(playerInfo.flipX)
    otherPlayerSprite.anims.play(playerInfo.animation, true)
    this.otherPlayersGroup.add(otherPlayerSprite)
    otherPlayerSprite.body!.immovable = true

    const speechBubble = this.spriteHandler.createSpeechBubble()
    speechBubble.on("pointerdown", () => {
      console.log(`Speech bubble clicked for player ${playerInfo.id}`)
    })

    this.otherPlayersContainer.add([otherPlayerSprite, speechBubble])
    this.otherPlayers.set(playerInfo.id, {
      sprite: otherPlayerSprite,
      speechBubble,
    })
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
      const otherPlayerData = this.otherPlayers.get(player.id)
      if (otherPlayerData) {
        otherPlayerData.sprite.body!.reset(player.x, player.y)
        otherPlayerData.sprite.setFlipX(player.flipX)
        otherPlayerData.sprite.anims.play(player.animation, true)

        otherPlayerData.speechBubble.setPosition(player.x, player.y - (CONFIG.SPRITE_CHARACTER_WIDTH + 5))
      }
    })

    this.socket.on("positionRejected", (correctPosition: PlayerData) => {
      this.playerSprite.body!.reset(correctPosition.x, correctPosition.y)
    })

    this.socket.on("playerLeft", (playerId: string) => {
      const otherPlayer = this.otherPlayers.get(playerId)
      if (otherPlayer) {
        this.otherPlayersGroup.remove(otherPlayer.sprite, true, true)
        otherPlayer.sprite.destroy()
        otherPlayer.speechBubble.destroy()
        this.otherPlayers.delete(playerId)
      }
    })
  }

  update() {
    if (!this.playerSprite) return

    if (this.isAttacking) {
      this.playerSprite.setVelocity(0, 0)
    } else {
      let dx = 0
      let dy = 0

      if (this.joystick && this.joystick.force > 0) {
        dx = this.joystick.forceX
        dy = this.joystick.forceY

        const magnitude = Math.sqrt(dx * dx + dy * dy)
        if (magnitude > 0) {
          dx /= magnitude
          dy /= magnitude
        }

        if (Math.abs(dx) > 0.2) {
          this.playerSprite.setFlipX(dx < 0)
        }
      } else {
        if (this.cursors.left.isDown || this.keys.A.isDown || this.keys.H.isDown) {
          dx = -1
          this.playerSprite.setFlipX(true)
        } else if (this.cursors.right.isDown || this.keys.D.isDown || this.keys.L.isDown) {
          dx = 1
          this.playerSprite.setFlipX(false)
        }

        if (this.cursors.up.isDown || this.keys.W.isDown || this.keys.K.isDown) {
          dy = -1
        } else if (this.cursors.down.isDown || this.keys.S.isDown || this.keys.J.isDown) {
          dy = 1
        }
      }

      const speed = 80
      this.playerSprite.setVelocity(dx * speed, dy * speed)

      let animation = `${this.playerSpriteType}-idle`
      if (dx !== 0 || dy !== 0) {
        animation = `${this.playerSpriteType}-walk`
      }

      if (this.playerSprite.anims.getName() !== animation) {
        this.playerSprite.anims.play(animation, true)
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && !this.isAttacking) {
      this.isAttacking = true
      const attackAnimation = `${this.playerSpriteType}-attack1`
      this.playerSprite.setVelocity(0, 0) // Stop movement during attack
      this.playerSprite.anims.play(attackAnimation, true)
    }

    const currentPlayerData: PlayerData = {
      id: this.socket.id!,
      spriteType: this.playerSpriteType,
      x: this.playerSprite.x,
      y: this.playerSprite.y,
      animation: this.playerSprite.anims.getName(),
      flipX: this.playerSprite.flipX,
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

    this.otherPlayers.forEach((otherPlayerData, playerId) => {
      const otherPlayerSprite = otherPlayerData.sprite
      const otherPlayerSpeechBubble = otherPlayerData.speechBubble

      otherPlayerSpeechBubble.setPosition(
        otherPlayerSprite.x,
        otherPlayerSprite.y - (CONFIG.SPRITE_CHARACTER_WIDTH + 5),
      )

      const distance = Phaser.Math.Distance.Between(
        this.playerSprite.x,
        this.playerSprite.y,
        otherPlayerSprite.x,
        otherPlayerSprite.y,
      )

      if (distance < CONFIG.INTERACTION_PROXIMITY_THRESHOLD) {
        if (!otherPlayerSpeechBubble.visible) {
          otherPlayerSpeechBubble.setVisible(true)
          otherPlayerSpeechBubble.anims.play("speech-bubble-animation")
        }
      } else {
        if (
          otherPlayerSpeechBubble.visible &&
          otherPlayerSpeechBubble.anims.currentAnim?.key !== "speech-bubble-animation-reverse"
        ) {
          otherPlayerSpeechBubble.anims.play("speech-bubble-animation-reverse")
          otherPlayerSpeechBubble.once("animationcomplete", () => {
            otherPlayerSpeechBubble.setVisible(false)
          })
        }
      }
    })
  }

  resize(gameSize: Phaser.Structs.Size) {
    const width = gameSize.width
    const height = gameSize.height

    this.cameras.main.setViewport(0, 0, width, height)
    if (this.playerSprite) {
      this.cameras.main.centerOn(this.playerSprite.x, this.playerSprite.y)
    }

    if (this.uiCamera) {
      this.uiCamera.setViewport(0, 0, width, height)
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
  roundPixels: true,
}

new Phaser.Game(config)
