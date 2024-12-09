import { CONFIG } from "../shared/config"
import { calculateDistance, getGameTime, isInZone } from "../shared/functions"
import logger from "../shared/logger"
import { Database, Tables } from "../shared/supabase-types"
import {
  BroadcastMessage,
  ChatMessage,
  NewsItem,
  PlayerData,
  PlayerSpriteDefinition,
  UpdatePlayerData,
  VoteCandidate,
  availableVoteCandidates,
} from "../shared/types"
import { RoomInstance } from "./rooms"
import { SupabaseClient, createClient } from "@supabase/supabase-js"
import cors from "cors"
import express from "express"
import { createServer } from "http"
import { DefaultEventsMap } from "socket.io"
import { Server } from "socket.io"
import { v4 as uuidv4 } from "uuid"

const app = express()
app.use(cors())

const server = createServer(app)

interface SocketData {
  playerSupabaseClient: SupabaseClient<Database>
}

const io = new Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData>(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

const rooms: Map<string, RoomInstance> = new Map()

async function handleRoomInstance(
  supabaseClient: SupabaseClient<Database>,
  roomDefinition: Tables<"room">,
  databaseRoomInstance?: Tables<"room_instance">,
): Promise<RoomInstance | undefined> {
  // if databaseRoomInstance is not provided, it means that we are creating a new room instance
  try {
    const roomInstanceId = databaseRoomInstance ? databaseRoomInstance.id : uuidv4()

    const { data: mapData, error: mapError } = await supabaseClient
      .from("room")
      .select("map!inner (*)")
      .eq("id", roomDefinition.id)
      .single()
    if (mapError) {
      logger.error("Error fetching map config:")
      console.error(mapError)
      return
    }
    const mapConfig = mapData.map

    const { data: npcData, error: npcError } = await supabaseClient
      .from("npc_room")
      .select("npc!inner (*)")
      .eq("room_id", roomDefinition.id)
    if (npcError) {
      logger.error("Error fetching NPCs:")
      console.error(npcError)
      return
    }
    const npcs = npcData.map((npc) => npc.npc)

    // If we're creating a new instance, create it in the database
    if (!databaseRoomInstance) {
      const { error: createError } = await supabaseClient.rpc("create_room_instance", {
        p_id: roomInstanceId,
        p_room_id: roomDefinition.id,
      })
      if (createError) {
        logger.error("Error creating room instance:")
        console.error(createError)
        return
      }
    }

    // For restoration, fetch NPC instances
    let npcInstances: Tables<"npc_instance">[] = []
    if (databaseRoomInstance) {
      const { data: instances, error: instancesError } = await supabaseClient
        .from("npc_instance")
        .select("*")
        .eq("room_instance_id", databaseRoomInstance.id)
      if (instancesError) {
        logger.error("Error fetching NPC instances:")
        console.error(instancesError)
        return
      }
      npcInstances = instances
    }

    const roomInstance = new RoomInstance(roomInstanceId, mapConfig, npcs, roomDefinition.scenario, npcInstances)

    if (databaseRoomInstance && databaseRoomInstance.newspaper) {
      roomInstance.setNewsPaper(databaseRoomInstance.newspaper as NewsItem[])
    }

    rooms.set(roomInstance.getId(), roomInstance)
    roomInstance.initialize()

    if (mapConfig.name === "electiontown") {
      initializeVotingNotifications(roomInstance)
    }

    // Set up cleanup timeout
    setTimeout(() => {
      if (roomInstance.getRealPlayerCount() === 0) {
        // ToDo: clean up room ONLY IF `user_room_instance` is empty
        // BUT if it is empty that means that user have no rights to delete it
        // const { data, error } = await supabaseClient.rpc("delete_room_instance", { p_id: roomId });
        // if (error) {
        //   logger.error("Error deleting room instance:");
        //   console.error(error);
        //   return;
        // }
        // logger.info(`Supabase room instance deleted for room '${data}'`);
        roomInstance.cleanup()
        rooms.delete(roomInstance.getId())
      }
    }, CONFIG.ROOM_CLEANUP_TIMEOUT)

    logger.info(`Supabase room instance ${databaseRoomInstance ? "restored" : "created"} for room '${roomInstanceId}'`)
    return roomInstance
  } catch (error) {
    logger.error("Unexpected error in handleRoomInstance:")
    console.error(error)
    return
  }
}

io.on("connection", (socket) => {
  const playerId = socket.id
  let currentRoom: RoomInstance | null = null
  socket.data.playerSupabaseClient = createClient<Database>(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
  )

  socket.on("authorizeSupabase", (access_token: string) => {
    socket.data.playerSupabaseClient = createClient<Database>(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      },
    )

    socket.data.playerSupabaseClient.auth.getUser().then(({ data, error }) => {
      if (error) {
        logger.error("Error authorizing Supabase:")
        console.error(error)
        return
      } else {
        logger.info(`Supabase client authorized for player ${data?.user.email}`)
      }
    })
  })

  socket.on("createRoom", async (roomId: integer, callback: (roomInstanceId: string | null) => void) => {
    try {
      const { data: room, error } = await socket.data.playerSupabaseClient
        .from("room")
        .select("*")
        .eq("id", roomId)
        .single()

      if (error) {
        logger.error("Error fetching room:")
        console.error(error)
        callback(null)
        return
      }

      if (room.type === "shared") {
        const { data: room_instance, error } = await socket.data.playerSupabaseClient
          .from("room_instance")
          .select("*")
          .eq("room_id", roomId)
          .single()

        let roomInstance: RoomInstance | undefined
        if (error) {
          // no instance found, create one
          roomInstance = (await handleRoomInstance(socket.data.playerSupabaseClient, room))!
        } else {
          // instance exists, check if it's still active
          roomInstance = Array.from(rooms.values()).find((r) => r.getId() === room_instance.id)
          if (!roomInstance) {
            // instance is not active, restore it
            roomInstance = (await handleRoomInstance(socket.data.playerSupabaseClient, room, room_instance))!
          }
        }
        callback(roomInstance.getId())
      } else {
        const roomInstance = await handleRoomInstance(socket.data.playerSupabaseClient, room)
        if (!roomInstance) {
          callback(null)
          return
        }
        callback(roomInstance.getId())
      }
    } catch (error) {
      logger.error("Unexpected error in createRoom:")
      console.error(error)
      callback(null)
    }
  })

  socket.on("getAvailableRooms", (callback: (rooms: string[]) => void) => {
    const availableRooms = Array.from(rooms.values()).map((room) => room.getId())
    callback(availableRooms)
  })

  socket.on(
    "joinRoom",
    (roomId: string, isNPC: boolean, username: string, spriteDefinition: PlayerSpriteDefinition) => {
      const room = rooms.get(roomId)
      if (!room) {
        logger.error(
          `Room not found: ${roomId}. User ${username} failed to join. Available rooms: ${Array.from(rooms.keys())}`,
        )
        socket.emit("joinError", "Room not found")
        return
      }

      if (currentRoom) {
        leaveCurrentRoom()
      }

      currentRoom = room
      socket.join(room.getId())

      const spawnPosition = currentRoom.findValidPosition()
      let playerData: PlayerData = {
        id: playerId,
        isNPC: isNPC,
        username: username,
        spriteDefinition: spriteDefinition,
        x: spawnPosition.x,
        y: spawnPosition.y,
        animation: `${username}-idle-down`,
      }

      // currentRoom.addPlayer(playerId, isNPC, username, spriteDefinition, spawnPosition)
      currentRoom.addPlayer(
        socket.data.playerSupabaseClient,
        playerId,
        isNPC,
        username,
        spriteDefinition,
        spawnPosition,
      )

      logger.info(
        `${isNPC ? "NPC" : "Player"} '${username}' connected. Number of players: ${currentRoom.getPlayerCount()}`,
      )

      socket.emit("existingPlayers", Array.from(currentRoom.getPlayers().values()))
      socket.emit("news", currentRoom.getNewsPaper())
      socket.to(roomId).emit("playerJoined", playerData)
    },
  )

  socket.on("updatePlayerData", (playerData: UpdatePlayerData) => {
    if (!currentRoom) return

    const currentPlayerData = currentRoom.getPlayer(playerId)
    if (!currentPlayerData) return

    if (playerData.npcState) {
      const newNPCState = {
        ...currentPlayerData.npcState,
        ...playerData.npcState,
      }
      playerData.npcState = newNPCState
    }

    const newPlayerData: PlayerData = {
      ...currentPlayerData,
      ...playerData,
    }

    currentRoom.updatePlayerData(playerId, newPlayerData)

    // avoiding sending npcState to other players if it didn't change
    if (!playerData.npcState) {
      const { npcState, ...playerDataToSend } = newPlayerData
      socket.to(currentRoom.getId()).emit("playerDataChanged", playerDataToSend)
    } else {
      socket.to(currentRoom.getId()).emit("playerDataChanged", newPlayerData)
    }

    // socket.broadcast.emit("playerDataChanged", newPlayerData)
  })

  socket.on("endConversation", (message: ChatMessage) => {
    if (!currentRoom) return

    logger.info(`endConversation receied from ${message.from}: ${message.message}`)
    currentRoom.getPlayers().forEach(async (player) => {
      if (player.username === message.to) {
        const recipientSocket = io.sockets.sockets.get(player.id)
        if (recipientSocket) {
          recipientSocket.emit("endConversation", message)
          const sender = currentRoom?.getPlayer(playerId)!
          emitOverhear(currentRoom!.getPlayers(), sender, player, message)
          if (!player.isNPC || !sender.isNPC) {
            // await saveMessageToSupabase(message, player.username)
          }
        } else {
          socket.emit("messageError", { error: "Recipient not found" })
        }
      }
    })
  })

  socket.on("broadcast", (message: BroadcastMessage) => {
    if (!currentRoom) return

    const broadcastPlace = message.place
    const zoneObject = currentRoom.getPlaces()!.find((obj) => obj.name === broadcastPlace)!

    currentRoom.getPlayers().forEach((player) => {
      const isInBroadcastZone = isInZone(
        player.x,
        player.y,
        zoneObject.x,
        zoneObject.y,
        zoneObject.width,
        zoneObject.height,
      )

      if (isInBroadcastZone) {
        const recipientSocket = io.sockets.sockets.get(player.id)
        if (recipientSocket) {
          recipientSocket.emit("listenBroadcast", message)
        } else {
          socket.emit("broadcastError", { error: "Recipient not found" })
        }
      }
    })
  })

  socket.on("sendMessage", (message: ChatMessage) => {
    if (!currentRoom) return

    // logger.info(`Message from ${message.from} to ${message.to}: ${message.message}`)

    if (message.to === "all") {
      io.emit("newMessage", message)
    } else {
      currentRoom.getPlayers().forEach(async (player) => {
        if (player.username === message.to) {
          const recipientSocket = io.sockets.sockets.get(player.id)
          if (recipientSocket) {
            recipientSocket.emit("newMessage", message)

            // Overhear logic
            const sender = currentRoom?.getPlayer(playerId)!
            emitOverhear(currentRoom?.getPlayers()!, sender, player, message)
            if (!player.isNPC || !sender.isNPC) {
              // const supabaseUserName = player.isNPC ? sender.username : player.username
              // await saveMessageToSupabase(message, supabaseUserName)
            }
          } else {
            socket.emit("messageError", { error: "Recipient not found" })
          }
        }

        //distance emit to overhear
      })
    }
  })

  function emitOverhear(
    players: Map<string, PlayerData>,
    sender: PlayerData,
    receiver: PlayerData,
    message: ChatMessage,
  ) {
    players.forEach((potentialOverhearPlayer) => {
      if (
        !potentialOverhearPlayer.isNPC &&
        potentialOverhearPlayer.username !== message.from &&
        potentialOverhearPlayer.username !== message.to &&
        (calculateDistance(sender.x, sender.y, potentialOverhearPlayer.x, potentialOverhearPlayer.y) <=
          CONFIG.INTERACTION_PROXIMITY_THRESHOLD ||
          calculateDistance(receiver.x, receiver.y, potentialOverhearPlayer.x, potentialOverhearPlayer.y) <=
            CONFIG.INTERACTION_PROXIMITY_THRESHOLD)
      ) {
        const potentialOverhearSocket = io.sockets.sockets.get(potentialOverhearPlayer.id)
        if (potentialOverhearSocket) {
          potentialOverhearSocket.emit("overhearMessage", message)
        }
      }
    })
  }

  socket.on("sendNews", (newsItem: NewsItem) => {
    if (!currentRoom) return
    currentRoom.addNewsItem(newsItem)
    io.to(currentRoom.getId()).emit("news", newsItem)
  })

  socket.on("vote", (candidate: VoteCandidate) => {
    if (!currentRoom) return
    const player = currentRoom.getPlayer(playerId)

    if (!player) {
      logger.error(
        `User ${playerId} not found. Available players: ${Array.from(currentRoom.getPlayers().keys())} (${currentRoom.getPlayerCount()} total)`,
      )
      return
    }

    if (availableVoteCandidates.includes(player.username as VoteCandidate)) {
      logger.warn(`User ${player.username} is not eligible to vote (voted for ${candidate})`)
      return
    }

    const currentVoteResults = currentRoom.getVoteResults()[currentRoom.getVoteResults().length - 1]
    currentVoteResults.set(player.username, candidate)

    logger.info(`User ${player.username} voted for ${candidate}`)

    const totalNPCVotes = Array.from(currentVoteResults.entries()).filter(([username]) => {
      const playerData = Array.from(currentRoom!.getPlayers().values()).find((p) => p.username === username)
      return playerData?.isNPC && !availableVoteCandidates.includes(username as VoteCandidate)
    }).length

    const totalEligibleNPCs = Array.from(currentRoom.getPlayers().values()).filter(
      (p) => p.isNPC && !availableVoteCandidates.includes(p.username as VoteCandidate),
    ).length

    if (totalNPCVotes >= totalEligibleNPCs) {
      // Create a map to store voters by candidate
      const votersByCandidate = new Map<VoteCandidate, string[]>()
      currentVoteResults.forEach((candidate, voter) => {
        if (!votersByCandidate.has(candidate)) {
          votersByCandidate.set(candidate, [])
        }
        if (!availableVoteCandidates.includes(voter as VoteCandidate)) {
          votersByCandidate.get(candidate)!.push(voter)
        }
      })

      // Calculate overall results
      const results = new Map<VoteCandidate, number>()
      currentVoteResults.forEach((candidate) => {
        const currentCount = results.get(candidate) || 0
        results.set(candidate, currentCount + 1)
      })

      const totalVotes = Array.from(results.values()).reduce((sum, count) => sum + count, 0)

      // Format the results with detailed breakdown
      let formattedResults = `📊 Election Results\n\n`

      // Sort candidates by vote count in descending order
      const sortedResults = Array.from(results.entries()).sort(([, a], [, b]) => b - a)

      sortedResults.forEach(([candidate, votes]) => {
        const percentage = ((votes / totalVotes) * 100).toFixed(1)
        const bar = "█".repeat(Math.floor((votes / totalVotes) * 20))
        const voters = votersByCandidate.get(candidate) || []

        // Sort voters alphabetically
        voters.sort((a, b) => a.localeCompare(b))

        // Format main candidate results
        formattedResults += `${candidate}\n`
        formattedResults += `${bar} ${votes} votes (${percentage}%)\n`

        // Add voter breakdown
        formattedResults += `Supported by: ${voters.join(", ")}\n`
        formattedResults += `\n\n`
      })

      formattedResults += `Total Votes Cast: ${totalVotes}\n`

      const newsItem: NewsItem = {
        // date: getGameTime().toISOString(),
        date: new Date().toISOString(),
        message: formattedResults,
      }
      currentRoom.addNewsItem(newsItem)
      io.to(currentRoom.getId()).emit("news", newsItem)

      currentRoom.finishVoting()
    }
  })

  function leaveCurrentRoom() {
    if (!currentRoom) return

    const player = currentRoom.removePlayer(playerId)
    if (player) {
      socket.to(currentRoom.getId()).emit("playerLeft", player.username)
      logger.info(
        `User ${player.username} left room ${currentRoom.getId()}. Real players in room: ${currentRoom.getRealPlayerCount()}`,
      )
      if (!player.isNPC) {
        currentRoom.dumpStateToDatabase(socket.data.playerSupabaseClient)
        if (currentRoom.getRealPlayerCount() === 0) {
          currentRoom.cleanup()
          rooms.delete(currentRoom.getId())
        }
      }
    }

    socket.leave(currentRoom.getId())
  }

  socket.on("leaveRoom", () => {
    leaveCurrentRoom()
    currentRoom = null
  })

  socket.on("disconnect", () => {
    leaveCurrentRoom()
  })
})

function sendVotingReminder(room: RoomInstance) {
  const newsItem: NewsItem = {
    // date: getGameTime().toISOString(),
    date: new Date().toISOString(),
    message: `🗳️ Polling is open! Make your voice heard - cast your vote for the next leader!`,
    // message: `🗳️ Polling is open! Make your voice heard - cast your vote for the next leader! Only ${getDaysRemaining()} game days left.`,
    place: room.getMapConfig().voting_place_name,
  }
  room.addNewsItem(newsItem)
  io.to(room.getId()).emit("news", newsItem)
}

function initializeVotingNotifications(room: RoomInstance) {
  let lastNotificationGameTime = new Date(getGameTime().setDate(getGameTime().getDate() - 1))
  setInterval(() => {
    const currentGameTime = getGameTime()

    const gameHoursSinceLastNotification =
      (currentGameTime.getTime() - lastNotificationGameTime.getTime()) / 1000 / 60 / 60

    if (gameHoursSinceLastNotification >= CONFIG.VOTE_EVERY_N_HOURS) {
      sendVotingReminder(room)
      lastNotificationGameTime = currentGameTime
    }
  }, 10000)
}

server.listen(CONFIG.SERVER_PORT, () => {
  logger.info(`Server is running on ${CONFIG.SERVER_URL}`)
})
