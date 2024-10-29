const isDevelopment = process.env.NODE_ENV !== "production"

export const CONFIG = {
  SERVER_PORT: 3000,
  SERVER_URL: isDevelopment ? "http://localhost:3000" : "https://api.simtown.dev",
  // this is a debug flag that will make the AI Stop reflecting and get stuck after finishing any move action
  ENABLE_NPC_AUTOMATION: isDevelopment ? true : false,
  TILE_SIZE: 16,
  SPRITE_WIDTH: 16,
  SPRITE_HEIGHT: 32,
  SPRITE_COLLISION_BOX_HEIGHT: 16,
  INTERACTION_PROXIMITY_THRESHOLD: 30,
  TARGET_DATE: new Date("2024-11-05T00:00:00Z"),
}
