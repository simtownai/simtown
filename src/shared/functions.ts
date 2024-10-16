import { CONFIG } from "./config"
import { PlayerSpriteDefinition } from "./types"

export function getTime(): Date {
  const currentDate = new Date() // Real current time
  const timeDifferenceMs = currentDate.getTime() - CONFIG.START_DATE.getTime() // Time difference in milliseconds

  // Multiply the time difference by 60 to speed up the in-game time
  const gameTimeDifferenceMs = timeDifferenceMs * 60

  // Calculate the in-game date by adding the adjusted time difference to the start date
  const inGameDate = new Date(CONFIG.START_DATE.getTime() + gameTimeDifferenceMs)

  return inGameDate
}

export function createRandomSpriteDefinition(): PlayerSpriteDefinition {
  const randomInt = (max: number) => Math.floor(Math.random() * max) + 1
  const paddedNumber = (num: number) => num.toString().padStart(2, "0")

  const body = `Body_0${randomInt(9)}` as PlayerSpriteDefinition["body"]
  const eyes = `Eyes_0${randomInt(7)}` as PlayerSpriteDefinition["eyes"]

  const outfitGroup = randomInt(33)
  const outfitVariant = randomInt(3) // Most outfits have up to 5 variants
  const outfit =
    `Outfit_${paddedNumber(outfitGroup)}_${paddedNumber(outfitVariant)}` as PlayerSpriteDefinition["outfit"]

  const hairstyleGroup = randomInt(29)
  const hairstyleVariant = randomInt(7) // Most hairstyles have up to 7 variants
  const hairstyle =
    `Hairstyle_${paddedNumber(hairstyleGroup)}_${paddedNumber(hairstyleVariant)}` as PlayerSpriteDefinition["hairstyle"]

  const spriteDefinition: PlayerSpriteDefinition = {
    body,
    eyes,
    outfit,
    hairstyle,
  }

  // Randomly add an accessory (50% chance)
  if (Math.random() < 0.5) {
    const accessoryGroup = randomInt(19)
    const accessoryVariant = randomInt(6) // Most accessories have up to 6 variants
    let accessoryName = ""

    switch (accessoryGroup) {
      case 1:
        accessoryName = "Ladybug"
        break
      case 2:
        accessoryName = "Bee"
        break
      case 3:
        accessoryName = "Backpack"
        break
      case 4:
        accessoryName = "Snapback"
        break
      case 5:
        accessoryName = "Dino_Snapback"
        break
      case 6:
        accessoryName = "Policeman_Hat"
        break
      case 7:
        accessoryName = "Bataclava"
        break
      case 8:
        accessoryName = "Detective_Hat"
        break
      case 9:
        accessoryName = "Zombie_Brain"
        break
      case 10:
        accessoryName = "Bolt"
        break
      case 11:
        accessoryName = "Beanie"
        break
      case 12:
        accessoryName = "Mustache"
        break
      case 13:
        accessoryName = "Beard"
        break
      case 14:
        accessoryName = "Gloves"
        break
      case 15:
        accessoryName = "Glasses"
        break
      case 16:
        accessoryName = "Monocle"
        break
      case 17:
        accessoryName = "Medical_Mask"
        break
      case 18:
        accessoryName = "Chef"
        break
      case 19:
        accessoryName = "Party_Cone"
        break
      default:
        accessoryName = "Unknown"
    }

    spriteDefinition.accessory =
      `Accessory_${paddedNumber(accessoryGroup)}_${accessoryName}_${paddedNumber(accessoryVariant)}` as PlayerSpriteDefinition["accessory"]
  }

  return spriteDefinition
}
