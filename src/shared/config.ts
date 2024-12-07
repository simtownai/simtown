export const isDevelopment = process.env.NODE_ENV !== "production"

export const CONFIG = {
  SERVER_PORT: 3000,
  SERVER_URL: isDevelopment ? "http://localhost:3000" : "https://api.simtown.ai",
  MODEL_NAME: isDevelopment ? "gpt-4o-mini" : "gpt-4o",
  // this is a debug flag that will make the AI Stop reflecting and get stuck after finishing any move action
  ENABLE_NPC_AUTOMATION: isDevelopment ? true : true,
  TILE_SIZE: 16,
  SPRITE_WIDTH: 16,
  SPRITE_HEIGHT: 32,
  SPRITE_COLLISION_BOX_HEIGHT: 16,
  INTERACTION_PROXIMITY_THRESHOLD: 30,
  VOTE_EVERY_N_HOURS: 24,
  ROOM_CLEANUP_TIMEOUT: 2 * 60 * 1000, // 2 minutes
  TARGET_DATE: new Date("2024-12-06T00:00:00Z"),
  DEFAULT_GAME: "harry",
  AUTH_ENABLED: false,
  MAP_COLLISION_LAYER_NAME: "COLLISIONS",
  MAP_ROADS_LAYER_NAME: "PREFERABLE PATHS",
  MAP_PLACES_LAYER_NAME: "PLACES",
}
