import { CONFIG } from "../shared/config"
import { PlayerData } from "../shared/types"
import "./style.css"
import Phaser from "phaser"
import { Socket, io } from "socket.io-client"

class MainScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap
  private socket: Socket
  private playerSpriteIndex: number = 0
  private player!: Phaser.Physics.Arcade.Sprite
  private lastSentPlayerData: PlayerData | null = null
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
  private backgroundMusic!: Phaser.Sound.BaseSound
  private collisionLayer!: Phaser.Tilemaps.TilemapLayer
  // private wallLayer!: Phaser.Tilemaps.TilemapLayer

  constructor() {
    super({ key: "MainScene" })
    this.socket = io(CONFIG.SERVER_URL, { autoConnect: false })
  }

  preload() {
    this.load.pack("pack", "assets/simple-pack.json")
    // this.load.pack("pack", "assets/villie-pack.json")
    this.load.spritesheet("characters", "assets/sprites/characters.png", {
      frameWidth: CONFIG.CHARACTER_WIDTH,
      frameHeight: CONFIG.CHARACTER_WIDTH,
    })
    // this.load.audio("background-music", "assets/background-music.mp3")
  }

  create() {
    this.setupMap()
    this.setupPlayer()
    this.setupCamera()
    this.setupInput()
    this.setupAnimations()
    // this.setupSound()
    this.setupSocketListeners()
    this.socket.connect()

    this.scale.on("resize", this.resize, this)
  }

  private setupMap() {
    this.map = this.make.tilemap({ key: "map" })
    const tileset = this.map.addTilesetImage("tileset", "tiles")!
    this.map.createLayer("Ground", tileset)
    this.map.createLayer("Objects", tileset)!
    this.collisionLayer = this.map.createLayer("Collisions", tileset)!
    this.collisionLayer.setCollisionByExclusion([-1])
    this.collisionLayer.setVisible(false)

    // this.map = this.make.tilemap({ key: "GenerativeAgentsDevMap" })
    // const collisions = this.map.addTilesetImage("blocks", "blocks_1")!
    // const walls = this.map.addTilesetImage("Room_Builder_32x32", "walls")!
    // const interiors_pt1 = this.map.addTilesetImage("interiors_pt1", "interiors_pt1")!
    // const interiors_pt2 = this.map.addTilesetImage("interiors_pt2", "interiors_pt2")!
    // const interiors_pt3 = this.map.addTilesetImage("interiors_pt3", "interiors_pt3")!
    // const interiors_pt4 = this.map.addTilesetImage("interiors_pt4", "interiors_pt4")!
    // const interiors_pt5 = this.map.addTilesetImage("interiors_pt5", "interiors_pt5")!
    // const CuteRPG_Field_B = this.map.addTilesetImage("CuteRPG_Field_B", "CuteRPG_Field_B")!
    // const CuteRPG_Field_C = this.map.addTilesetImage("CuteRPG_Field_C", "CuteRPG_Field_C")!
    // const CuteRPG_Harbor_C = this.map.addTilesetImage("CuteRPG_Harbor_C", "CuteRPG_Harbor_C")!
    // const CuteRPG_Village_B = this.map.addTilesetImage("CuteRPG_Village_B", "CuteRPG_Village_B")!
    // const CuteRPG_Forest_B = this.map.addTilesetImage("CuteRPG_Forest_B", "CuteRPG_Forest_B")!
    // const CuteRPG_Desert_C = this.map.addTilesetImage("CuteRPG_Desert_C", "CuteRPG_Desert_C")!
    // const CuteRPG_Mountains_B = this.map.addTilesetImage("CuteRPG_Mountains_B", "CuteRPG_Mountains_B")!
    // const CuteRPG_Desert_B = this.map.addTilesetImage("CuteRPG_Desert_B", "CuteRPG_Desert_B")!
    // const CuteRPG_Forest_C = this.map.addTilesetImage("CuteRPG_Forest_C", "CuteRPG_Forest_C")!
    // const tileset_group_1 = [
    //   CuteRPG_Field_B,
    //   CuteRPG_Field_C,
    //   CuteRPG_Harbor_C,
    //   CuteRPG_Village_B,
    //   CuteRPG_Forest_B,
    //   CuteRPG_Desert_C,
    //   CuteRPG_Mountains_B,
    //   CuteRPG_Desert_B,
    //   CuteRPG_Forest_C,
    //   interiors_pt1,
    //   interiors_pt2,
    //   interiors_pt3,
    //   interiors_pt4,
    //   interiors_pt5,
    //   walls,
    // ]
    // this.map.createLayer("Bottom Ground", tileset_group_1, 0, 0)
    // this.map.createLayer("Exterior Ground", tileset_group_1, 0, 0)
    // this.map.createLayer("Exterior Decoration L1", tileset_group_1, 0, 0)
    // this.map.createLayer("Exterior Decoration L2", tileset_group_1, 0, 0)
    // this.map.createLayer("Interior Ground", tileset_group_1, 0, 0)
    // this.wallLayer = this.map.createLayer("Wall", [CuteRPG_Field_C, walls], 0, 0)!
    // this.map.createLayer("Interior Furniture L1", tileset_group_1, 0, 0)
    // this.map.createLayer("Interior Furniture L2 ", tileset_group_1, 0, 0)
    // const foregroundL1Layer = this.map.createLayer("Foreground L1", tileset_group_1, 0, 0)!
    // const foregroundL2Layer = this.map.createLayer("Foreground L2", tileset_group_1, 0, 0)!
    // // this.spawnJsonAreas = this.map.createLayer("Spawning Blocks", tileset_group_1, 0, 0)!
    // // this.sectorJsonAreas = this.map.createLayer("Sector Blocks", tileset_group_1, 0, 0)!
    // // this.objectInterAreas = this.map.createLayer("Object Interaction Blocks", tileset_group_1, 0, 0)!
    // // this.arenaBlockAreas = this.map.createLayer("Arena Blocks", tileset_group_1, 0, 0)!
    // this.collisionLayer = this.map.createLayer("Collisions", collisions, 0, 0)!
    // this.collisionLayer.setCollisionByExclusion([-1])
    // this.wallLayer.setCollisionByExclusion([-1])
    // this.collisionLayer.setVisible(false)
    // // Set layer depths
    // this.collisionLayer.setDepth(-1)
    // foregroundL1Layer.setDepth(2)
    // foregroundL2Layer.setDepth(2)

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

  private setupSound() {
    this.backgroundMusic = this.sound.add("background-music", { loop: true, volume: 0.5 })
    this.backgroundMusic.play()

    this.input.keyboard!.on("keydown-M", () => {
      if (this.backgroundMusic.isPlaying) {
        this.backgroundMusic.pause()
      } else {
        this.backgroundMusic.resume()
      }
    })
  }

  resize(gameSize: Phaser.Structs.Size) {
    const width = gameSize.width
    const height = gameSize.height

    this.cameras.main.setViewport(0, 0, width, height)

    // Update the camera bounds
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)

    // Keep the world bounds fixed to the map size
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)

    // Center the camera on the player
    if (this.player) {
      this.cameras.main.centerOn(this.player.x, this.player.y)
    }
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

    // Create current PlayerData object
    const currentPlayerData: PlayerData = {
      id: this.socket.id!,
      spriteIndex: this.playerSpriteIndex,
      x: this.player.x,
      y: this.player.y,
      animation: animation,
      lastFrame: this.player.frame.name,
    }

    // Check if PlayerData has changed
    if (
      !this.lastSentPlayerData ||
      this.lastSentPlayerData.x !== currentPlayerData.x ||
      this.lastSentPlayerData.y !== currentPlayerData.y ||
      this.lastSentPlayerData.animation !== currentPlayerData.animation ||
      this.lastSentPlayerData.spriteIndex !== currentPlayerData.spriteIndex ||
      this.lastSentPlayerData.lastFrame !== currentPlayerData.lastFrame
    ) {
      // Emit position and animation only if there's a change
      this.socket.emit("updatePlayerData", currentPlayerData)

      // Update last sent PlayerData
      this.lastSentPlayerData = { ...currentPlayerData }
    }
  }

  private setupSocketListeners() {
    this.socket.on("existingPlayers", (players: PlayerData[]) => {
      console.log("Received existing players:", players)
      players.forEach((player) => {
        if (player.id === this.socket.id) {
          this.playerSpriteIndex = player.spriteIndex
          this.player = this.physics.add.sprite(player.x, player.y, "characters")
          this.player.setCollideWorldBounds(true)
          this.physics.add.collider(this.player, this.collisionLayer)
          // this.physics.add.collider(this.player, this.wallLayer)
          this.cameras.main.startFollow(this.player, true, 0.09, 0.09)
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

    this.socket.on("playerDataChanged", (player: PlayerData) => {
      const otherPlayer = this.otherPlayers.get(player.id)
      if (otherPlayer) {
        otherPlayer.setPosition(player.x, player.y)
        if (player.animation.startsWith("idle")) {
          otherPlayer.anims.stop()
          otherPlayer.setFrame(player.lastFrame)
        } else {
          otherPlayer.anims.play(player.animation, true)
        }
      }
    })

    this.socket.on("positionRejected", (correctPosition: PlayerData) => {
      // Update the player's position to the correct position received from the server
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
    const otherPlayer = this.physics.add.sprite(playerInfo.x, playerInfo.y, "characters", playerInfo.lastFrame)
    if (playerInfo.animation.startsWith("idle")) {
      // Set the correct frame for idle animation
      otherPlayer.setFrame(playerInfo.lastFrame)
    } else {
      otherPlayer.anims.play(playerInfo.animation)
    }
    this.otherPlayers.set(playerInfo.id, otherPlayer)
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
}

new Phaser.Game(config)
