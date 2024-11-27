import { CONFIG } from "../../../shared/config"
import { getTextFromAction } from "../../../shared/functions"
import { PlayerData, PlayerSpriteDefinition } from "../../../shared/types"
import { EventBus } from "../EventBus"
import { AudioManager } from "./AudioManager"
import { PixelPerfectSprite } from "./pixelPerfectSprite"
import { SpriteHandler } from "./spriteHandler"
import VirtualJoystick from "phaser3-rex-plugins/plugins/virtualjoystick.js"
import { Socket } from "socket.io-client"

export const LAYER_DEPTHS = {
  TERRAIN: 0,
  WATER_PATH: 1,
  PATHS: 2,

  OBJECTS_BEHIND: 3,
  BUILDINGS_BEHIND: 4,

  PLAYER: {
    BASE: 1000,
    ADDONS: 5000,
  },

  BUILDINGS_OVER: 2000,
  TREES_OVER: 2001,

  COLLISIONS: -1,
} as const

export const LAYER_CONFIG = [
  { name: "TERRAIN", depth: LAYER_DEPTHS.TERRAIN },
  { name: "WATER PATH", depth: LAYER_DEPTHS.WATER_PATH },
  { name: "PATHS", depth: LAYER_DEPTHS.PATHS },
  { name: "OBJECTS (BEHIND PLAYER)", depth: LAYER_DEPTHS.OBJECTS_BEHIND },
  { name: "BUILDINGS (BEHIND PLAYER)", depth: LAYER_DEPTHS.BUILDINGS_BEHIND },
  { name: "BUILDINGS (OVER PLAYER)", depth: LAYER_DEPTHS.BUILDINGS_OVER },
  { name: "TREES (OVER PLAYER)", depth: LAYER_DEPTHS.TREES_OVER },
  { name: "COLLISIONS", depth: LAYER_DEPTHS.COLLISIONS },
] as const

interface OtherPlayerData {
  sprite: Phaser.Physics.Arcade.Sprite
  speechBubble: Phaser.GameObjects.Sprite
  playerData: PlayerData
  actionEmoji: Phaser.GameObjects.Text
  nameText: Phaser.GameObjects.Text
}

export class Game extends Phaser.Scene {
  private socket: Socket
  private map!: Phaser.Tilemaps.Tilemap
  private collisionLayer!: Phaser.Tilemaps.TilemapLayer
  private playerSprite!: Phaser.Physics.Arcade.Sprite
  private username: string
  private spriteDefinition: PlayerSpriteDefinition
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
    C: Phaser.Input.Keyboard.Key
    SPACE: Phaser.Input.Keyboard.Key
  }
  private lastSentPlayerData: PlayerData | null = null
  private isAttacking: boolean = false
  private joystick: VirtualJoystick
  private uiCamera!: Phaser.Cameras.Scene2D.Camera
  private gameLayers: Phaser.Tilemaps.TilemapLayer[] = []
  private uiContainer!: Phaser.GameObjects.Container

  private touchStartX: number = 0
  private touchStartY: number = 0
  private isTouching: boolean = false
  private touchMoved: boolean = false
  private lastDirection: "up" | "down" | "left" | "right" = "down"

  private audioManager: AudioManager

  private roomId: string

  constructor(socket: Socket, username: string, spriteDefinition: PlayerSpriteDefinition, roomId: string) {
    super({ key: "Game" })
    this.socket = socket
    this.username = username
    this.spriteDefinition = spriteDefinition
    this.roomId = roomId
  }

  create() {
    this.spriteHandler = new SpriteHandler(this)
    this.audioManager = new AudioManager(this)

    this.setupMap()
    this.spriteHandler.createAnimations()
    this.setupSocketListeners()
    this.socket.connect()
    this.scale.on("resize", this.resize, this)
    this.setupVirtualJoystick()
    this.setupCameras()
    this.setupInput()
    this.audioManager.startBackgroundMusic()

    // this.socket.emit("joinGame", false, this.username, this.spriteDefinition)
    this.socket.emit("joinRoom", this.roomId, false, this.username, this.spriteDefinition)

    EventBus.emit("current-scene-ready", this)
  }

  private setupMap() {
    this.uiContainer = this.add.container(0, 0)

    this.map = this.make.tilemap({ key: "map" })
    const tileset = this.map.addTilesetImage("Modern_Exteriors_Complete_Tileset", "tiles")!

    LAYER_CONFIG.map(({ name, depth }) => {
      const layer = this.map.createLayer(name, tileset)!
      layer.setDepth(depth)
      if (name === CONFIG.COLLISION_LAYER_NAME) {
        this.collisionLayer = layer
        this.collisionLayer.setCollisionByExclusion([-1])
        this.collisionLayer.setVisible(false)
      }
      this.gameLayers.push(layer)
      return layer
    })

    this.otherPlayersGroup = this.physics.add.group()
  }

  private setupCameras() {
    this.cameras.main.setZoom(3)
    this.cameras.main.setRoundPixels(true)
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
    this.cameras.main.visible = false

    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)

    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height)
    this.uiCamera.setZoom(1)
    this.uiCamera.setScroll(0, 0)

    this.uiCamera.ignore(this.gameLayers)
    this.cameras.main.ignore(this.uiContainer)
  }

  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,H,J,K,L,C,SPACE") as {
      W: Phaser.Input.Keyboard.Key
      A: Phaser.Input.Keyboard.Key
      S: Phaser.Input.Keyboard.Key
      D: Phaser.Input.Keyboard.Key
      H: Phaser.Input.Keyboard.Key
      J: Phaser.Input.Keyboard.Key
      K: Phaser.Input.Keyboard.Key
      L: Phaser.Input.Keyboard.Key
      C: Phaser.Input.Keyboard.Key
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

  private onPointerUp(_pointer: Phaser.Input.Pointer) {
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
      const attackAnimation = `${this.username}-attack-${this.lastDirection}`
      this.playerSprite.anims.play(attackAnimation, true)
    }
  }

  private setInputEnabled(enabled: boolean) {
    if (!enabled) {
      this.input.keyboard!.enabled = false
      this.input.enabled = false
      if (this.joystick) {
        this.joystick.setEnable(false)
      }
      this.input.keyboard!.manager.preventDefault = false
    } else {
      this.input.keyboard!.enabled = true
      this.input.enabled = true
      if (this.joystick) {
        this.joystick.setEnable(true)
      }
      this.input.keyboard!.manager.preventDefault = true
    }
  }

  private setupPlayer(playerInfo: PlayerData) {
    this.spriteHandler.createPlayerAnimations(playerInfo.username, playerInfo.spriteDefinition)
    this.playerSprite = new PixelPerfectSprite(this, playerInfo.x, playerInfo.y, `${this.username}-idle-down`)
    this.physics.add.existing(this.playerSprite)
    this.playerSprite.setCollideWorldBounds(true)
    this.physics.add.collider(this.playerSprite, this.collisionLayer)
    this.physics.add.collider(this.playerSprite, this.otherPlayersGroup)
    this.cameras.main.startFollow(this.playerSprite, true, 0.09, 0.09)
    this.cameras.main.visible = true
    this.spriteHandler.setupPlayer(this.playerSprite, this.username)
    this.resize(this.scale.gameSize)

    this.playerSprite.on(
      "animationcomplete",
      (animation: Phaser.Animations.Animation, _frame: Phaser.Animations.AnimationFrame) => {
        if (animation.key.startsWith(`${this.username}-attack`)) {
          this.isAttacking = false
        }
      },
    )

    this.add.existing(this.playerSprite)
    this.uiCamera.ignore(this.playerSprite)
    this.updateSpriteDepth(this.playerSprite)
  }

  private addOtherPlayer(playerInfo: PlayerData) {
    this.spriteHandler.createPlayerAnimations(playerInfo.username, playerInfo.spriteDefinition)
    const otherPlayerSprite = new PixelPerfectSprite(
      this,
      playerInfo.x,
      playerInfo.y,
      `${playerInfo.username}-idle-down`,
    )
    this.physics.add.existing(otherPlayerSprite)
    this.spriteHandler.setupPlayer(otherPlayerSprite, playerInfo.username)
    otherPlayerSprite.anims.play(playerInfo.animation, true)
    this.otherPlayersGroup.add(otherPlayerSprite)
    otherPlayerSprite.body!.immovable = true

    const speechBubble = this.spriteHandler.createSpeechBubble()
    speechBubble.setInteractive({ cursor: "pointer" })
    speechBubble.on("pointerdown", () => {
      console.log(`Opening chat with player ID: ${playerInfo.username}`)
      EventBus.emit("chat-collapse", false)
      EventBus.emit("set-chatmate", playerInfo.username)
    })
    speechBubble.on("pointerover", () => {
      document.body.style.cursor = "pointer"
    })
    speechBubble.on("pointerout", () => {
      document.body.style.cursor = "default"
    })

    otherPlayerSprite.setInteractive({ cursor: "pointer" })
    otherPlayerSprite.on("pointerdown", () => {
      if (playerInfo.isNPC) {
        // EventBus.emit("observe-collapse", false)
        // EventBus.emit("observed-npc", playerInfo.username)
        console.log(`Opening chat with player ID: ${playerInfo.username}`)
        EventBus.emit("chat-collapse", false)
        EventBus.emit("set-chatmate", playerInfo.username)
      }
    })

    const actionEmoji = this.add
      .text(0, 0, getTextFromAction(playerInfo.action), {
        fontSize: "24px",
        fontFamily: "Roboto",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5) // Set origin to left-center instead of center
      .setScale(0.33)
      .setVisible(playerInfo.action !== undefined)
    actionEmoji.setScrollFactor(1)
    actionEmoji.setPipeline("TextureTintPipeline")

    const nameText = this.add
      .text(0, 0, playerInfo.username, {
        fontSize: "14px",
        fontFamily: "Arial",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScale(0.33)

    this.add.existing(otherPlayerSprite)
    this.add.existing(speechBubble)
    this.add.existing(actionEmoji)
    this.add.existing(nameText)

    this.otherPlayers.set(playerInfo.username, {
      sprite: otherPlayerSprite,
      speechBubble,
      playerData: playerInfo,
      actionEmoji,
      nameText,
    })

    this.uiCamera.ignore([otherPlayerSprite, speechBubble, actionEmoji, nameText])
    this.updateSpriteDepth(otherPlayerSprite)
  }

  private updateSpriteDepth(sprite: Phaser.Physics.Arcade.Sprite) {
    sprite.setDepth(LAYER_DEPTHS.PLAYER.BASE + sprite.y)
  }

  private getClosestPlayer(): PlayerData | null {
    let closestPlayer: PlayerData | null = null
    let minDistance = CONFIG.INTERACTION_PROXIMITY_THRESHOLD

    this.otherPlayers.forEach((data, _id) => {
      const distance = Phaser.Math.Distance.Between(
        this.playerSprite.x,
        this.playerSprite.y,
        data.sprite.x,
        data.sprite.y,
      )

      if (distance < minDistance) {
        minDistance = distance
        closestPlayer = data.playerData
      }
    })

    return closestPlayer
  }

  private openChatWithClosestPlayer() {
    const closestPlayer = this.getClosestPlayer()

    if (closestPlayer) {
      console.log(`Opening chat with player ID: ${closestPlayer.username}`)
      EventBus.emit("chat-collapse", false)
      EventBus.emit("set-chatmate", closestPlayer.username)
    } else {
      console.log("No player in range to chat with, just opening chat")
      EventBus.emit("chats-container-collapse", false)
    }
  }

  private setupSocketListeners() {
    this.socket.on("existingPlayers", (players: PlayerData[]) => {
      console.log("Received existing players:", players)
      players.forEach((player) => {
        console.log("Player:", player)
        if (player.username === this.username) {
          this.setupPlayer(player)
        } else {
          this.addOtherPlayer(player)
        }
      })
    })

    this.socket.on("playerJoined", (player: PlayerData) => {
      console.log("Player joined:", player)
      if (player.username !== this.username) {
        this.addOtherPlayer(player)
      }
    })

    this.socket.on("playerDataChanged", (player: PlayerData) => {
      const otherPlayerData = this.otherPlayers.get(player.username)
      if (otherPlayerData) {
        otherPlayerData.sprite.body!.reset(player.x, player.y)
        otherPlayerData.sprite.anims.play(player.animation, true)
        otherPlayerData.speechBubble.setPosition(
          player.x,
          player.y - CONFIG.SPRITE_HEIGHT - 5, // Adjust to be above sprite
        )

        otherPlayerData.actionEmoji.setPosition(
          player.x + CONFIG.SPRITE_COLLISION_BOX_HEIGHT / 2,
          player.y - CONFIG.SPRITE_HEIGHT - 5, // Adjust to be above sprite
        )
        if (player.action && JSON.stringify(player.action) !== JSON.stringify(otherPlayerData.playerData.action)) {
          const emoji = getTextFromAction(player.action)
          if (emoji) {
            otherPlayerData.actionEmoji!.setText(emoji)
            otherPlayerData.actionEmoji!.setVisible(true)
          } else {
            otherPlayerData.actionEmoji!.setVisible(false)
          }
        } else if (!player.action) {
          otherPlayerData.actionEmoji!.setVisible(false)
        }
        otherPlayerData.playerData = player
      }
    })

    this.socket.on("positionRejected", (correctPosition: PlayerData) => {
      this.playerSprite.body!.reset(correctPosition.x, correctPosition.y)
    })

    this.socket.on("playerLeft", (username: string) => {
      const otherPlayer = this.otherPlayers.get(username)
      if (otherPlayer) {
        this.otherPlayersGroup.remove(otherPlayer.sprite, true, true)
        otherPlayer.sprite.destroy()
        otherPlayer.speechBubble.destroy()
        otherPlayer.actionEmoji.destroy()
        otherPlayer.nameText.destroy()
        this.otherPlayers.delete(username)
      }
    })

    EventBus.on("input-enabled", this.setInputEnabled, this)
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

        // Determine the last direction based on joystick input
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0.2) {
            this.lastDirection = "right"
          } else if (dx < -0.2) {
            this.lastDirection = "left"
          }
        } else {
          if (dy > 0.2) {
            this.lastDirection = "down"
          } else if (dy < -0.2) {
            this.lastDirection = "up"
          }
        }
      } else {
        // Keyboard input handling
        if (this.cursors.left.isDown || this.keys.A.isDown || this.keys.H.isDown) {
          dx = -1
          this.lastDirection = "left"
        } else if (this.cursors.right.isDown || this.keys.D.isDown || this.keys.L.isDown) {
          dx = 1
          this.lastDirection = "right"
        }

        if (this.cursors.up.isDown || this.keys.W.isDown || this.keys.K.isDown) {
          dy = -1
          this.lastDirection = "up"
        } else if (this.cursors.down.isDown || this.keys.S.isDown || this.keys.J.isDown) {
          dy = 1
          this.lastDirection = "down"
        }
      }

      const speed = 80
      this.playerSprite.setVelocity(dx * speed, dy * speed)

      let animation
      if (dx !== 0 || dy !== 0) {
        animation = `${this.username}-walk-${this.lastDirection}`
      } else {
        animation = `${this.username}-idle-${this.lastDirection}`
      }

      if (this.playerSprite.anims.getName() !== animation) {
        this.playerSprite.anims.play(animation, true)
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && !this.isAttacking) {
      this.isAttacking = true
      const attackAnimation = `${this.username}-attack-${this.lastDirection}`
      this.playerSprite.setVelocity(0, 0) // Stop movement during attack
      this.playerSprite.anims.play(attackAnimation, true)
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.C)) {
      this.openChatWithClosestPlayer()
      this.input.keyboard!.resetKeys()
    }

    this.updateSpriteDepth(this.playerSprite)

    const currentPlayerData: PlayerData = {
      id: this.socket.id!,
      isNPC: false,
      username: this.username,
      spriteDefinition: this.spriteDefinition,
      x: this.playerSprite.x,
      y: this.playerSprite.y,
      animation: this.playerSprite.anims.getName(),
    }

    if (
      !this.lastSentPlayerData ||
      this.lastSentPlayerData.x !== currentPlayerData.x ||
      this.lastSentPlayerData.y !== currentPlayerData.y ||
      this.lastSentPlayerData.animation !== currentPlayerData.animation
    ) {
      this.socket.emit("updatePlayerData", currentPlayerData)
      this.lastSentPlayerData = { ...currentPlayerData }
    }

    this.otherPlayers.forEach((otherPlayerData, _username) => {
      const otherPlayerSprite = otherPlayerData.sprite
      const otherPlayerSpeechBubble = otherPlayerData.speechBubble
      const actionEmoji = otherPlayerData.actionEmoji

      this.updateSpriteDepth(otherPlayerSprite)

      otherPlayerSpeechBubble.setPosition(otherPlayerSprite.x, otherPlayerSprite.y - CONFIG.SPRITE_HEIGHT - 5)
      otherPlayerSpeechBubble.setDepth(LAYER_DEPTHS.PLAYER.ADDONS + otherPlayerSprite.depth)

      actionEmoji.setPosition(
        otherPlayerSprite.x + CONFIG.SPRITE_COLLISION_BOX_HEIGHT / 2,
        otherPlayerSprite.y - CONFIG.SPRITE_HEIGHT - 5,
      )
      actionEmoji.setDepth(LAYER_DEPTHS.PLAYER.ADDONS + otherPlayerSprite.depth)

      otherPlayerData.nameText.setPosition(otherPlayerData.sprite.x, otherPlayerData.sprite.y - CONFIG.SPRITE_HEIGHT)
      otherPlayerData.nameText.setDepth(LAYER_DEPTHS.PLAYER.ADDONS + otherPlayerData.sprite.depth)

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
