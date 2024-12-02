export const isDevelopment = process.env.NODE_ENV !== "production"

export const CONFIG = {
  SERVER_PORT: 3000,
  SERVER_URL: isDevelopment ? "http://localhost:3000" : "https://api.simtown.ai",
  // this is a debug flag that will make the AI Stop reflecting and get stuck after finishing any move action
  MODEL_NAME: "gpt-4o",
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
}
