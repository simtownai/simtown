import { MapConfig } from "./types"

export const electiontownMap: MapConfig = {
  mapJSONFilename: "electiontown",
  tilesetPNGFilename: "Modern_Exteriors_Complete_Tileset",
  collisionLayerName: "COLLISIONS",
  roadsLayerName: "PREFERABLE PATHS",
  placesLayerName: "PLACES",
  spawnPlaceName: "CityHallSquare",
  votingPlaceName: "LibertySquare",
}

export const harrygobletoffireMap: MapConfig = {
  mapJSONFilename: "hogwarts_great_hall",
  tilesetPNGFilename: "great_hall",
  collisionLayerName: "COLLISIONS",
  roadsLayerName: "PREFERABLE PATHS",
  placesLayerName: "PLACES",
  spawnPlaceName: "Hall center",
  votingPlaceName: "Goblet of Fire",
}
