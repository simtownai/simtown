import { CONFIG } from "./config"

export function getTime(): Date {
  const currentDate = new Date() // Real current time
  const timeDifferenceMs = currentDate.getTime() - CONFIG.START_DATE.getTime() // Time difference in milliseconds

  // Multiply the time difference by 60 to speed up the in-game time
  const gameTimeDifferenceMs = timeDifferenceMs * 60

  // Calculate the in-game date by adding the adjusted time difference to the start date
  const inGameDate = new Date(CONFIG.START_DATE.getTime() + gameTimeDifferenceMs)

  return inGameDate
}
