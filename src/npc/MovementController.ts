import { CONFIG } from "../shared/config"
import { getDirection, gridToWorld, worldToGrid } from "../shared/functions"
import logger from "../shared/logger"
import { GridPosition, MoveTarget, PlayerData, UpdatePlayerData } from "../shared/types"
import EasyStar from "easystarjs"

const tinyMovementThreshold = 0.01

export class MovementController {
  private objectLayer: (typeof CONFIG.MAP_DATA.layers)[0]["objects"]
  private collisionLayer: (typeof CONFIG.MAP_DATA.layers)[0]
  private roadLayer: (typeof CONFIG.MAP_DATA.layers)[0] | undefined
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
  private pathRecalculationThreshold: number = 2
  private pathRecalculationInterval: number = 500
  private lastPathRecalculationTime: number = 0
  private lastKnownTargetPosition: { x: number; y: number } | null = null
  private currentMoveTarget: MoveTarget | null = null

  constructor(
    private getPlayerData: () => PlayerData,
    private getOtherPlayers: () => Map<string, PlayerData>,
    private sendMoveMessage: (blockingPlayer: PlayerData) => void,
    private updateAndEmitPlayerData: (updatePlayerData: UpdatePlayerData) => void,
  ) {
    this.collisionLayer = CONFIG.MAP_DATA.layers.find((layer) => layer.name === CONFIG.COLLISION_LAYER_NAME)!
    this.roadLayer = CONFIG.MAP_DATA.layers.find((layer) => layer.name === CONFIG.ROADS_LAYER_NAME)!
    this.objectLayer = CONFIG.MAP_DATA.layers.find((layer) => layer.name === CONFIG.PLACES_LAYER_NAME)!.objects!
    this.initializeCollisionGrid()
  }

  setMovementCompletedCallback(callback: () => void) {
    this.onMovementCompleted = callback
  }

  setMovementFailedCallback(callback: () => void) {
    this.onMovementFailed = callback
  }

  async initiateMovement(moveTarget: MoveTarget) {
    this.currentMoveTarget = moveTarget

    let targetPosition: GridPosition = { gridX: 0, gridY: 0 }
    const playerData = this.getPlayerData()

    if (moveTarget.targetType === "coordinates") {
      targetPosition = worldToGrid(moveTarget.x, moveTarget.y)
    } else if (moveTarget.targetType === "person") {
      const player = this.getOtherPlayers().get(moveTarget.name)
      if (!player) {
        logger.error(`(${this.getPlayerData().username}) couldn't find ${moveTarget.name}`)
        this.handleMovementCompleted()
        return
      }

      this.lastKnownTargetPosition = { x: player.x, y: player.y }
      const playerGridPos = worldToGrid(player.x, player.y)

      const bestAdjacentPosition = this.findBestAdjacentPosition(playerGridPos, playerData)
      if (!bestAdjacentPosition) {
        logger.error(`(${this.getPlayerData().username}) couldn't find a path to ${moveTarget.name}`)
        this.handleMovementCompleted()
        return
      }
      targetPosition = bestAdjacentPosition
    } else if (moveTarget.targetType === "place") {
      const place = this.getPlace(moveTarget.name)
      if (!place) {
        logger.error(`(${this.getPlayerData().username}) couldn't find ${moveTarget.name}`)
        this.handleMovementCompleted()
        return
      }

      const availablePositions = this.findAvailablePositionsInPlace(place)
      if (availablePositions.length === 0) {
        logger.error(`(${this.getPlayerData().username}) couldn't find a path to ${moveTarget.name}`)
        this.handleMovementCompleted()
        return
      }

      targetPosition = availablePositions[Math.floor(Math.random() * availablePositions.length)]
    }

    try {
      const startPostion = worldToGrid(playerData.x, playerData.y)
      if (JSON.stringify(startPostion) === JSON.stringify(targetPosition)) {
        logger.debug(`${this.getPlayerData().username} is already at the target position ${targetPosition}`)
        this.handleMovementCompleted()
        return
      }
      const foundPath = await this.calculatePath(startPostion, targetPosition, false)
      if (!foundPath || foundPath.length === 0) {
        throw new Error(
          `${this.getPlayerData().username} couldn't find a path to the target position ${targetPosition}`,
        )
      }

      this.setPath(foundPath, targetPosition)
      return `${this.getPlayerData().username} is moving to ${moveTarget}`
    } catch (error) {
      logger.error(`(${this.getPlayerData().username}) Error initiating movement:`, error)
      return "Couldn't move there, those numbers are not valid coordinates"
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

    // Handle person following recalculation
    if (this.currentMoveTarget?.targetType === "person") {
      const currentTime = Date.now()
      if (currentTime - this.lastPathRecalculationTime > this.pathRecalculationInterval) {
        const player = this.getOtherPlayers().get(this.currentMoveTarget.name)

        if (!player) {
          console.log("Target player not found")
          this.handleMovementCompleted()
          return
        }

        if (this.lastKnownTargetPosition) {
          const distanceMoved = Math.hypot(
            player.x - this.lastKnownTargetPosition.x,
            player.y - this.lastKnownTargetPosition.y,
          )

          if (distanceMoved > this.pathRecalculationThreshold) {
            // logger.warn(
            //   `(${this.getPlayerData().username}) target person '${this.currentMoveTarget.name}' moved significantly, recalculating path.`,
            // )
            this.lastKnownTargetPosition = { x: player.x, y: player.y }
            this.lastPathRecalculationTime = currentTime
            this.initiateMovement(this.currentMoveTarget)
            return
          }
        }
      }
    }

    // Ensure pathIndex is within bounds
    if (this.pathIndex < 0) {
      this.pathIndex = 0
    }

    const nextTile = this.path[this.pathIndex]
    const worldPos = gridToWorld(nextTile)

    if (this.isCellBlocked(nextTile)) {
      this.setIdleAnimation()
      if (this.pathIndex === this.path.length - 1) {
        this.initiateMovement(this.currentMoveTarget!)
      } else {
        this.handleBlockedPath(nextTile)
      }
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

  ifMoveTargetReached(moveTarget: MoveTarget): boolean {
    const playerData = this.getPlayerData()
    const currentPosition = worldToGrid(playerData.x, playerData.y)

    if (moveTarget.targetType === "coordinates") {
      const targetGridPosition = worldToGrid(moveTarget.x, moveTarget.y)
      return currentPosition.gridX === targetGridPosition.gridX && currentPosition.gridY === targetGridPosition.gridY
    }

    if (moveTarget.targetType === "person") {
      const targetPlayer = this.getOtherPlayers().get(moveTarget.name)
      if (!targetPlayer) return true // Consider reached if target player no longer exists

      const targetGridPosition = worldToGrid(targetPlayer.x, targetPlayer.y)
      // Check if we're in a cardinal direction (N,E,S,W) adjacent to the target player
      const isHorizontallyAdjacent =
        Math.abs(currentPosition.gridX - targetGridPosition.gridX) === 1 &&
        currentPosition.gridY === targetGridPosition.gridY
      const isVerticallyAdjacent =
        Math.abs(currentPosition.gridY - targetGridPosition.gridY) === 1 &&
        currentPosition.gridX === targetGridPosition.gridX

      return isHorizontallyAdjacent || isVerticallyAdjacent
    }

    if (moveTarget.targetType === "place") {
      const place = this.getPlace(moveTarget.name)
      if (!place) return true // Consider reached if place no longer exists

      const minGridPos = worldToGrid(place.x + 1, place.y + 1)
      const maxGridPos = worldToGrid(place.x + place.width, place.y + place.height)

      return (
        currentPosition.gridX >= minGridPos.gridX &&
        currentPosition.gridX <= maxGridPos.gridX &&
        currentPosition.gridY >= minGridPos.gridY &&
        currentPosition.gridY <= maxGridPos.gridY
      )
    }

    return false
  }

  private getPlace(name: string): NonNullable<(typeof CONFIG.MAP_DATA.layers)[0]["objects"]>[number] | undefined {
    let place = this.objectLayer!.find((obj) => obj.name === name)
    if (!place) {
      place = this.objectLayer!.find((obj) => obj.name === name.replace(" (podium)", ""))
    }
    return place
  }

  private findAvailablePositionsInPlace(
    place: NonNullable<(typeof CONFIG.MAP_DATA.layers)[0]["objects"]>[number],
  ): GridPosition[] {
    const availablePositions: GridPosition[] = []

    const minGridPos = worldToGrid(place.x + 1, place.y + 1)
    const maxGridPos = worldToGrid(place.x + place.width, place.y + place.height)

    for (let y = minGridPos.gridY; y <= maxGridPos.gridY; y++) {
      for (let x = minGridPos.gridX; x <= maxGridPos.gridX; x++) {
        const gridPos: GridPosition = { gridX: x, gridY: y }

        if (!this.isCellBlocked(gridPos)) {
          availablePositions.push(gridPos)
        }
      }
    }

    return availablePositions
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

  private handleMovementCompleted() {
    if (this.onMovementCompleted) {
      this.onMovementCompleted()
      this.setIdleAnimation()
      this.onMovementCompleted = null
    }
  }

  private setPath(path: GridPosition[], targetPosition: GridPosition) {
    if (path && path.length > 0) {
      // Find the closest point on the new path to the NPC's current position
      let closestIndex = 0
      let minDistance = Infinity
      const playerData = this.getPlayerData()
      for (let i = 0; i < path.length; i++) {
        const pathPointWorld = gridToWorld(path[i])
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

  private setIdleAnimation() {
    const playerData = this.getPlayerData()
    if (!playerData.animation.includes("idle")) {
      const animation = this.getAnimation(playerData.username, 0, 0)
      this.updateAndEmitPlayerData({ animation })
    }
  }

  private getAnimation(username: string, deltaX: number, deltaY: number): string {
    // Increased threshold to account for tiny movements
    const isMoving = Math.abs(deltaX) > tinyMovementThreshold || Math.abs(deltaY) > tinyMovementThreshold

    if (isMoving) {
      const direction = getDirection(deltaX, deltaY)
      this.lastDirection = direction
      return `${username}-walk-${direction}`
    } else {
      // Use the lastDirection for idle animation
      return `${username}-idle-${this.lastDirection}`
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
    // logger.debug("Attempting to recalculate path due to player blockage")
    // logger.debug(
    //   `(${this.getPlayerData().username}) Attempting to recalculate path to ${this.currentMoveTarget?.targetType}`,
    // )
    try {
      const playerData = this.getPlayerData()
      const currentPos: GridPosition = worldToGrid(playerData.x, playerData.y)
      const newPath = await this.calculatePath(currentPos, this.targetPosition, considerPlayers)
      if (newPath && newPath.length > 0) {
        // logger.debug(
        //   `(${this.getPlayerData().username}) Found alternative path to ${this.currentMoveTarget?.targetType}`,
        // )
        return newPath
      } else {
        logger.debug(
          `(${this.getPlayerData().username}) No alternative path found to ${this.currentMoveTarget?.targetType} after recalculation`,
        )
        return null
      }
    } catch (error) {
      logger.error(`(${this.getPlayerData().username}) Error recalculating path:`, error)
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
      this.calculatePath(worldToGrid(playerData.x, playerData.y), this.targetPosition, false)
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

  private findBestAdjacentPosition(targetGridPos: GridPosition, playerData: PlayerData): GridPosition | null {
    const adjacentOffsets: GridPosition[] = [
      { gridX: 0, gridY: -1 }, // North
      { gridX: 1, gridY: 0 }, // East
      { gridX: 0, gridY: 1 }, // South
      { gridX: -1, gridY: 0 }, // West
    ]

    let possibleTargets: GridPosition[] = []

    for (const offset of adjacentOffsets) {
      const adjPos: GridPosition = {
        gridX: targetGridPos.gridX + offset.gridX,
        gridY: targetGridPos.gridY + offset.gridY,
      }

      if (!this.isCellBlocked(adjPos)) {
        possibleTargets.push(adjPos)
      }
    }

    if (possibleTargets.length === 0) {
      return null
    }

    // Choose the closest target
    possibleTargets.sort((a, b) => {
      const worldPositionA = gridToWorld(a)
      const worldPositionB = gridToWorld(b)
      const distA = Math.hypot(worldPositionA.x - playerData.x, worldPositionA.y - playerData.y)
      const distB = Math.hypot(worldPositionB.x - playerData.x, worldPositionB.y - playerData.y)
      return distA - distB
    })

    return possibleTargets[0]
  }

  private isCellBlocked(cell: GridPosition): boolean {
    // Check for players at the given grid position
    for (const player of this.getOtherPlayers().values()) {
      const playerGridPos = worldToGrid(player.x, player.y)
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

  private getBlockingPlayer(cell: GridPosition): PlayerData | null {
    for (const player of this.getOtherPlayers().values()) {
      const playerGridPos = worldToGrid(player.x, player.y)
      if (playerGridPos.gridX === cell.gridX && playerGridPos.gridY === cell.gridY) {
        return player
      }
    }
    return null
  }

  private async calculatePath(
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

  private getGridWithPlayers(): number[][] {
    const gridWithPlayers = this.collisionGrid.map((row) => row.slice())
    for (const player of this.getOtherPlayers().values()) {
      const gridPos = worldToGrid(player.x, player.y)
      if (
        gridPos.gridX >= 0 &&
        gridPos.gridX < gridWithPlayers[0].length &&
        gridPos.gridY >= 0 &&
        gridPos.gridY < gridWithPlayers.length
      ) {
        gridWithPlayers[gridPos.gridY][gridPos.gridX] = 0
      }
    }
    return gridWithPlayers
  }
}
