import mapData from "../../public/assets/maps/simple-map.json"
import { CONFIG } from "../shared/config"
import { GridPosition, MoveTarget, PlayerData, UpdatePlayerData } from "../shared/types"
import EasyStar from "easystarjs"

const tinyMovementThreshold = 0.01

export class MovementController {
  private objectLayer: (typeof mapData.layers)[0]["objects"]
  private collisionLayer: (typeof mapData.layers)[0]
  private roadLayer: (typeof mapData.layers)[0] | undefined
  private collisionGrid: number[][]
  private path: GridPosition[] = []
  private pathIndex = 0
  private speed = 50 // pixels per second
  private blockedByPlayerInfo: { username: string; startTime: number } | null = null
  private moveMessageSent: boolean = false
  private isRecalculatingPath: boolean = false
  private isPaused: boolean = false
  private targetPosition: GridPosition
  private onMovementFailed: (() => void) | null = null
  private onMovementCompleted: (() => void) | null = null
  private lastDirection: "left" | "right" | "up" | "down" = "down"

  movementCompleted: boolean = false

  constructor(
    private getPlayerData: () => PlayerData,
    private getOtherPlayers: () => Map<string, PlayerData>,
    private sendMoveMessage: (blockingPlayer: PlayerData) => void,
    private updateAndEmitPlayerData: (updatePlayerData: UpdatePlayerData) => void,
  ) {
    this.collisionLayer = mapData.layers.find((layer) => layer.name === "Collisions")!
    this.roadLayer = mapData.layers.find((layer) => layer.name === "Roads")
    this.objectLayer = mapData.layers.find((layer) => layer.name === "Boxes")!.objects!
    this.initializeCollisionGrid()
  }

  private initializeCollisionGrid() {
    this.collisionGrid = []
    for (let y = 0; y < this.collisionLayer.height!; y++) {
      const row: number[] = []
      for (let x = 0; x < this.collisionLayer.width!; x++) {
        const tileIndex = y * this.collisionLayer.width! + x
        const collisionTileId = this.collisionLayer.data![tileIndex]
        const roadTileId = this.roadLayer ? this.roadLayer.data![tileIndex] : null

        if (collisionTileId !== 0) {
          row.push(0)
        } else if (roadTileId !== null && roadTileId !== 0) {
          row.push(1)
        } else {
          row.push(10)
        }
      }
      this.collisionGrid.push(row)
    }
  }

  setMovementFailedCallback(callback: () => void) {
    this.onMovementFailed = callback
  }

  setMovementCompletedCallback(callback: () => void) {
    this.onMovementCompleted = callback
  }

  private handleMovementCompleted() {
    this.movementCompleted = true // Set flag when movement is completed
    if (this.onMovementCompleted) {
      this.onMovementCompleted()
      this.setIdleAnimation()
      this.onMovementCompleted = null
    }
  }

  public setPath(path: GridPosition[], targetPosition: GridPosition) {
    this.movementCompleted = false // Reset flag when a new path is set
    if (path && path.length > 0) {
      // Find the closest point on the new path to the NPC's current position
      let closestIndex = 0
      let minDistance = Infinity
      const playerData = this.getPlayerData()
      for (let i = 0; i < path.length; i++) {
        const pathPointWorld = this.gridToWorld(path[i])
        const dx = pathPointWorld.x - playerData.x
        const dy = pathPointWorld.y - playerData.y
        const distance = Math.hypot(dx, dy)

        if (distance < minDistance) {
          minDistance = distance
          closestIndex = i
        }
      }

      this.path = path
      this.pathIndex = closestIndex + 1 // Smoothing the direction after recalculation
      this.targetPosition = targetPosition
      this.blockedByPlayerInfo = null
      this.moveMessageSent = false
    }
  }

  pause() {
    this.isPaused = true
    this.setIdleAnimation()
  }

  resume() {
    this.isPaused = false
  }

  move(deltaTime: number) {
    if (this.isPaused || this.isRecalculatingPath || this.pathIndex >= this.path.length) {
      this.setIdleAnimation()
      return
    }

    // Ensure pathIndex is within bounds
    if (this.pathIndex < 0) {
      this.pathIndex = 0
    }

    const nextTile = this.path[this.pathIndex]
    const worldPos = this.gridToWorld(nextTile)

    if (this.isCellBlocked(nextTile)) {
      this.handleBlockedPath(nextTile)
      this.setIdleAnimation()
      return
    }

    this.blockedByPlayerInfo = null
    this.moveMessageSent = false

    const playerData = this.getPlayerData()
    let updatePlayerData: UpdatePlayerData = {}

    const dx = worldPos.x - playerData.x
    const dy = worldPos.y - playerData.y

    const distance = Math.sqrt(dx * dx + dy * dy)
    const moveDistance = (this.speed * deltaTime) / 1000

    let moveX = 0
    let moveY = 0

    if (distance <= moveDistance) {
      moveX = dx
      moveY = dy
      updatePlayerData = {
        x: worldPos.x,
        y: worldPos.y,
      }
      this.pathIndex++
    } else {
      moveX = (dx / distance) * moveDistance
      moveY = (dy / distance) * moveDistance
      updatePlayerData = {
        x: playerData.x + moveX,
        y: playerData.y + moveY,
      }
    }

    updatePlayerData.animation = this.getAnimation(playerData.username, moveX, moveY)

    this.updateAndEmitPlayerData(updatePlayerData)

    if (this.pathIndex >= this.path.length) {
      this.handleMovementCompleted()
    }
  }

  private setIdleAnimation() {
    const playerData = this.getPlayerData()
    const animation = this.getAnimation(playerData.username, 0, 0)
    this.updateAndEmitPlayerData({ animation })
  }

  private getAnimation(username: string, deltaX: number, deltaY: number): string {
    // Increased threshold to account for tiny movements
    const isMoving = Math.abs(deltaX) > tinyMovementThreshold || Math.abs(deltaY) > tinyMovementThreshold

    if (isMoving) {
      const direction = this.getDirection(deltaX, deltaY)
      this.lastDirection = direction
      return `${username}-walk-${direction}`
    } else {
      // Use the lastDirection for idle animation
      return `${username}-idle-${this.lastDirection}`
    }
  }

  private getDirection(deltaX: number, deltaY: number): "left" | "right" | "up" | "down" {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal movement
      return deltaX > 0 ? "right" : "left"
    } else {
      // Vertical movement
      return deltaY > 0 ? "down" : "up"
    }
  }

  private handleBlockedPath(nextTile: GridPosition) {
    const blockingPlayer = this.getBlockingPlayer(nextTile)

    if (blockingPlayer) {
      this.handleBlockedByPlayer(blockingPlayer)
    } else {
      this.recalculatePath()
    }

    this.setIdleAnimation()
  }

  private async handleBlockedByPlayer(blockingPlayer: PlayerData) {
    if (!this.blockedByPlayerInfo || this.blockedByPlayerInfo.username !== blockingPlayer.username) {
      this.blockedByPlayerInfo = { username: blockingPlayer.username, startTime: Date.now() }
      this.moveMessageSent = false

      // Attempt to recalculate path when first blocked
      const newPath = await this.attemptPathRecalculation(true)
      if (newPath) {
        // If a new path is found, update the path and return
        this.setPath(newPath, this.targetPosition)
        return
      }
    }

    const elapsedTime = Date.now() - this.blockedByPlayerInfo.startTime

    if (elapsedTime < 5000) {
      if (!this.moveMessageSent) {
        this.sendMoveMessage(blockingPlayer)
        this.moveMessageSent = true
      }
    } else {
      this.giveUpOnTarget()
    }
  }

  private async attemptPathRecalculation(considerPlayers: boolean): Promise<GridPosition[] | null> {
    console.log("Attempting to recalculate path due to player blockage")
    try {
      const playerData = this.getPlayerData()
      const currentPos: GridPosition = this.worldToGrid(playerData.x, playerData.y)
      const newPath = await this.calculatePath(currentPos, this.targetPosition, considerPlayers)
      if (newPath && newPath.length > 0) {
        console.log("New path found after recalculation")
        return newPath
      } else {
        console.log("No alternative path found after recalculating")
        return null
      }
    } catch (error) {
      console.error("Error recalculating path:", error)
      return null
    }
  }

  private giveUpOnTarget() {
    this.blockedByPlayerInfo = null
    this.moveMessageSent = false
    this.path = []
    this.pathIndex = 0

    if (this.onMovementFailed) {
      this.onMovementFailed()
      this.onMovementFailed = null
    }

    console.log("Blocked for 5 seconds, giving up on reaching the target.")
  }

  private recalculatePath() {
    if (!this.isRecalculatingPath) {
      this.isRecalculatingPath = true
      this.setIdleAnimation()
      const playerData = this.getPlayerData()
      this.calculatePath(this.worldToGrid(playerData.x, playerData.y), this.targetPosition, false)
        .then(this.handleRecalculatedPath.bind(this))
        .catch(this.handleRecalculationError.bind(this))
    }
  }

  private handleRecalculatedPath(newPath: GridPosition[] | null) {
    this.isRecalculatingPath = false
    if (newPath && newPath.length > 0) {
      this.setPath(newPath, this.targetPosition)
    } else {
      console.log("No alternative path found after recalculating.")
      if (this.onMovementFailed) {
        this.onMovementFailed()
        this.onMovementFailed = null
      }
    }
  }

  private handleRecalculationError(error: any) {
    this.isRecalculatingPath = false
    console.error("Error recalculating path:", error)
    if (this.onMovementFailed) {
      this.onMovementFailed()
      this.onMovementFailed = null
    }
  }

  async initiateMovement(moveTarget: MoveTarget) {
    let targetPosition: GridPosition = { gridX: 0, gridY: 0 }
    const playerData = this.getPlayerData()

    if (moveTarget.targetType === "coordinates") {
      targetPosition = this.worldToGrid(moveTarget.x, moveTarget.y)
    } else if (moveTarget.targetType === "person") {
      const player = this.getOtherPlayers().get(moveTarget.name)
      if (!player) {
        return "Couldn't find that player"
      }

      const playerGridPos = this.worldToGrid(player.x, player.y)

      const adjacentOffsets: GridPosition[] = [
        { gridX: 0, gridY: -1 }, // North
        { gridX: 1, gridY: 0 }, // East
        { gridX: 0, gridY: 1 }, // South
        { gridX: -1, gridY: 0 }, // West
      ]

      let possibleTargets: GridPosition[] = []

      for (const offset of adjacentOffsets) {
        const adjPos: GridPosition = {
          gridX: playerGridPos.gridX + offset.gridX,
          gridY: playerGridPos.gridY + offset.gridY,
        }

        if (!this.isCellBlocked(adjPos)) {
          possibleTargets.push(adjPos)
        }
      }

      if (possibleTargets.length === 0) {
        return "No adjacent position available to move to"
      }

      // Choose the closest target
      possibleTargets.sort((a, b) => {
        const worldPositionA = this.gridToWorld(a)
        const worldPositionB = this.gridToWorld(b)
        const distA = Math.hypot(worldPositionA.x - playerData.x, worldPositionA.y - playerData.y)
        const distB = Math.hypot(worldPositionB.x - playerData.x, worldPositionB.y - playerData.y)
        return distA - distB
      })
      targetPosition = possibleTargets[0]
    } else if (moveTarget.targetType === "place") {
      const place = this.objectLayer!.find((obj) => obj.name === moveTarget.name)
      if (!place) {
        return "Couldn't find that place"
      }

      const randomX = Math.round(place.x + 2 + Math.random() * (place.width - 2))
      const randomY = Math.round(place.y + 2 + Math.random() * (place.height - 2))

      targetPosition = this.worldToGrid(randomX, randomY)
    }

    console.log(`Received command to move to position: (${targetPosition})`, moveTarget)

    try {
      const foundPath = await this.calculatePath(this.worldToGrid(playerData.x, playerData.y), targetPosition, false)
      if (!foundPath || foundPath.length === 0) {
        throw new Error("Couldn't find path")
      }

      this.setPath(foundPath, targetPosition)
      return "Moving to target position"
    } catch (error) {
      console.error("Error in move_to:", error)
      return "Couldn't move there, those numbers are not valid coordinates"
    }
  }

  getPlayerPosition(_playerId: string): { x: number; y: number } | null {
    const temp_player = this.getOtherPlayers().keys().next().value
    const player = this.getOtherPlayers().get(temp_player)
    return player ? { x: player.x, y: player.y } : null
  }

  worldToGrid(x: number, y: number): GridPosition {
    return {
      gridX: Math.floor((x - 1) / CONFIG.TILE_SIZE),
      gridY: Math.floor((y - 1) / CONFIG.TILE_SIZE),
    }
  }

  gridToWorld(cell: GridPosition): { x: number; y: number } {
    return {
      x: cell.gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
      y: cell.gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE,
    }
  }

  isCellBlocked(cell: GridPosition): boolean {
    // Check for players at the given grid position
    for (const player of this.getOtherPlayers().values()) {
      const playerGridPos = this.worldToGrid(player.x, player.y)
      if (playerGridPos.gridX === cell.gridX && playerGridPos.gridY === cell.gridY) {
        return true
      }
    }

    // Check for static collisions
    if (
      cell.gridX < 0 ||
      cell.gridY < 0 ||
      cell.gridY >= this.collisionGrid.length ||
      cell.gridX >= this.collisionGrid[0].length
    ) {
      return true
    }
    const tileValue = this.collisionGrid[cell.gridY][cell.gridX]
    return tileValue === 0
  }

  getBlockingPlayer(cell: GridPosition): PlayerData | null {
    for (const player of this.getOtherPlayers().values()) {
      const playerGridPos = this.worldToGrid(player.x, player.y)
      if (playerGridPos.gridX === cell.gridX && playerGridPos.gridY === cell.gridY) {
        return player
      }
    }
    return null
  }

  async calculatePath(
    startPosition: GridPosition,
    targetPosition: GridPosition,
    considerPlayers: boolean,
  ): Promise<GridPosition[] | null> {
    const easystar = new EasyStar.js()
    easystar.setAcceptableTiles([1, 10])
    easystar.setTileCost(1, 1)
    easystar.setTileCost(10, 10)
    easystar.disableCornerCutting()

    let grid: number[][]
    if (considerPlayers) {
      grid = this.getGridWithPlayers()
    } else {
      grid = this.collisionGrid
    }

    easystar.setGrid(grid)

    return new Promise((resolve) => {
      easystar.findPath(
        startPosition.gridX,
        startPosition.gridY,
        targetPosition.gridX,
        targetPosition.gridY,
        (foundPath) => {
          resolve(foundPath ? foundPath.map((cell) => ({ gridX: cell.x, gridY: cell.y })) : null)
        },
      )
      easystar.calculate()
    })
  }

  getGridWithPlayers(): number[][] {
    const gridWithPlayers = this.collisionGrid.map((row) => row.slice())
    for (const player of this.getOtherPlayers().values()) {
      const gridPos = this.worldToGrid(player.x, player.y)
      if (
        gridPos.gridX >= 0 &&
        gridPos.gridX < gridWithPlayers[0].length &&
        gridPos.gridY >= 0 &&
        gridPos.gridY < gridWithPlayers.length
      ) {
        console.log(gridWithPlayers.length, gridWithPlayers[0].length)
        gridWithPlayers[gridPos.gridY][gridPos.gridX] = 0
      }
    }
    return gridWithPlayers
  }
}
