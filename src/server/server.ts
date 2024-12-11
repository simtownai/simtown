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
import { PostgrestError, SupabaseClient, createClient } from "@supabase/supabase-js"
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
  playerId: string
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

    const { data: npcInstances, error: instancesError } = await supabaseClient
      .from("npc_instance")
      .select("*")
      .eq("room_instance_id", databaseRoomInstance ? databaseRoomInstance.id : roomInstanceId)
    if (instancesError) {
      logger.error("Error fetching NPC instances:")
      console.error(instancesError)
      return
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
  socket.data.playerId = socket.id

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
        logger.info(`Supabase client authorized for player ${data.user.email}`)
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
    async (
      roomId: string,
      isNPC: boolean,
      playerId: string,
      username: string,
      spriteDefinition: PlayerSpriteDefinition,
      position?: { x: number; y: number },
    ) => {
      let room = rooms.get(roomId)
      if (!room) {
        const { data: databaseRoomInstance, error } = await socket.data.playerSupabaseClient
          .from("room_instance")
          .select("*")
          .eq("id", roomId)
          .single()
        if (error) {
          logger.error("Error fetching room instance:")
          console.error(error)
          return
        }
        if (!databaseRoomInstance) {
          logger.error(
            `Room not found: ${roomId}. User ${username} failed to join. Available rooms: ${Array.from(rooms.keys())}`,
          )
          socket.emit("joinError", "Room not found")
          return
        }

        const { data: roomDefinition, error: roomError } = await socket.data.playerSupabaseClient
          .from("room")
          .select("*")
          .eq("id", databaseRoomInstance.room_id)
          .single()
        if (roomError) {
          logger.error("Error fetching room:")
          console.error(roomError)
          return
        }

        room = await handleRoomInstance(socket.data.playerSupabaseClient, roomDefinition, databaseRoomInstance)
        if (!room) {
          logger.error("Error creating room instance")
          return
        }
      }

      if (currentRoom) {
        leaveCurrentRoom()
      }

      currentRoom = room
      socket.data.playerId = playerId
      socket.join(room.getId())

      const spawnPosition = position || currentRoom.findValidPosition()

      currentRoom.addPlayer(
        socket.id,
        socket.data.playerSupabaseClient,
        playerId,
        isNPC,
        username,
        spriteDefinition,
        spawnPosition,
      )
      console.log(currentRoom.getPlayer(playerId))

      logger.info(
        `${isNPC ? "NPC" : "Player"} '${username}' connected. Number of players: ${currentRoom.getPlayerCount()}`,
      )

      socket.emit("existingPlayers", Array.from(currentRoom.getPlayers().values()))
      socket.emit("news", currentRoom.getNewsPaper())
      socket.to(roomId).emit("playerJoined", currentRoom.getPlayer(playerId))
    },
  )

  socket.on("updatePlayerData", (playerData: UpdatePlayerData) => {
    if (!currentRoom) return

    const currentPlayerData = currentRoom.getPlayer(socket.data.playerId)
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

    currentRoom.updatePlayerData(socket.data.playerId, newPlayerData)

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
        const recipientSocket = io.sockets.sockets.get(currentRoom!.getPlayerSocketId(player.id))
        if (recipientSocket) {
          recipientSocket.emit("endConversation", message)
          const sender = currentRoom?.getPlayer(socket.data.playerId)!
          emitOverhear(currentRoom!, currentRoom!.getPlayers(), sender, player, message)
          if (!player.isNPC || !sender.isNPC) {
            await handleMessage(socket.data.playerSupabaseClient, {
              from: sender.id,
              to: player.id,
              message: message.message,
            })
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
        const recipientSocket = io.sockets.sockets.get(currentRoom!.getPlayerSocketId(player.id))
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

    logger.info(`Message from ${message.from} to ${message.to}: ${message.message}`)

    if (message.to === "all") {
      io.emit("newMessage", message)
    } else {
      currentRoom.getPlayers().forEach(async (player) => {
        if (player.username === message.to) {
          const recipientSocket = io.sockets.sockets.get(currentRoom!.getPlayerSocketId(player.id))
          if (recipientSocket) {
            recipientSocket.emit("newMessage", message)

            // Overhear logic
            const sender = currentRoom?.getPlayer(socket.data.playerId)!
            emitOverhear(currentRoom!, currentRoom?.getPlayers()!, sender, player, message)
            if (!player.isNPC || !sender.isNPC) {
              // const supabaseUserName = player.isNPC ? sender.username : player.username
              // await saveMessageToSupabase(message, supabaseUserName)
              await handleMessage(socket.data.playerSupabaseClient, {
                from: sender.id,
                to: player.id,
                message: message.message,
              })
            }
          } else {
            logger.error(`Error sending the message: recipient not found`)
            socket.emit("messageError", { error: "Recipient not found" })
          }
        }

        //distance emit to overhear
      })
    }
  })

  function emitOverhear(
    room: RoomInstance,
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
        const potentialOverhearSocket = io.sockets.sockets.get(room.getPlayerSocketId(potentialOverhearPlayer.id))
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
    const player = currentRoom.getPlayer(socket.data.playerId)

    if (!player) {
      logger.error(
        `User ${socket.data.playerId} not found. Available players: ${Array.from(currentRoom.getPlayers().keys())} (${currentRoom.getPlayerCount()} total)`,
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

    const player = currentRoom.removePlayer(socket.data.playerId)
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

interface MessageInput {
  from: string
  to: string
  message: string
}

class MessageHandlerError extends Error {
  constructor(
    message: string,
    public step: string,
    public originalError?: PostgrestError | Error,
  ) {
    super(message)
    console.error(originalError)
    this.name = "MessageHandlerError"
  }
}

export async function handleMessage(supabase: SupabaseClient, { from, to, message }: MessageInput) {
  try {
    // Helper function to determine if a string is a UUID
    const isUUID = (str: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      return uuidRegex.test(str)
    }

    // Input validation
    if (!from || !to || !message) {
      throw new MessageHandlerError(
        "Missing required fields",
        "input_validation",
        new Error(`from: ${from}, to: ${to}, message: ${message}`),
      )
    }

    // Convert participants to the correct format for database
    const participant1 = {
      user_id: isUUID(from) ? from : null,
      npc_instance_id: !isUUID(from) ? parseInt(from) : null,
    }

    const participant2 = {
      user_id: isUUID(to) ? to : null,
      npc_instance_id: !isUUID(to) ? parseInt(to) : null,
    }

    // Validate participant conversion
    if (!participant1.user_id && !participant1.npc_instance_id) {
      throw new MessageHandlerError(
        'Invalid "from" format',
        "participant_conversion",
        new Error(`Unable to parse "from" value: ${from}`),
      )
    }

    if (!participant2.user_id && !participant2.npc_instance_id) {
      throw new MessageHandlerError(
        'Invalid "to" format',
        "participant_conversion",
        new Error(`Unable to parse "to" value: ${to}`),
      )
    }

    // Find existing thread
    let existingThreadsQuery = supabase.from("thread_participant").select(`
        thread_id,
        user_id,
        npc_instance_id
      `)

    // Add the appropriate filter based on participant1 type
    if (participant1.user_id) {
      existingThreadsQuery = existingThreadsQuery.eq("user_id", participant1.user_id)
    } else {
      existingThreadsQuery = existingThreadsQuery.eq("npc_instance_id", participant1.npc_instance_id)
    }

    const { data: existingThreads, error: threadError } = await existingThreadsQuery

    if (threadError) {
      throw new MessageHandlerError("Failed to search for existing threads", "thread_search", threadError)
    }

    let threadId: string | null = null

    // Check if there's a thread with exactly these two participants
    if (existingThreads) {
      for (const thread of existingThreads) {
        // Find the other participant in this thread
        const { data: participants, error: participantError } = await supabase
          .from("thread_participant")
          .select("*")
          .eq("thread_id", thread.thread_id)

        if (participantError) {
          console.warn(`Failed to fetch participants for thread ${thread.thread_id}:`, participantError)
          continue
        }

        // Should be exactly 2 participants
        if (participants.length !== 2) continue

        // Check if the other participant matches
        const hasMatchingParticipants = participants.some(
          (p) =>
            (participant2.user_id && p.user_id === participant2.user_id) ||
            (participant2.npc_instance_id && p.npc_instance_id === participant2.npc_instance_id),
        )

        if (hasMatchingParticipants) {
          threadId = thread.thread_id
          break
        }
      }
    }

    // If no thread exists, create a new one
    if (!threadId) {
      const { data: newThread, error: createThreadError } = await supabase.from("thread").insert({}).select().single()

      if (createThreadError) {
        throw new MessageHandlerError("Failed to create new thread", "thread_creation", createThreadError)
      }

      if (!newThread) {
        throw new MessageHandlerError("Created thread returned no data", "thread_creation")
      }

      threadId = newThread.id

      try {
        // Attempt to create thread participants
        const { error: createParticipantsError } = await supabase.from("thread_participant").insert([
          {
            thread_id: threadId,
            ...participant1,
          },
          {
            thread_id: threadId,
            ...participant2,
          },
        ])

        if (createParticipantsError) {
          // Check if this is a foreign key violation (anonymous user)
          if (createParticipantsError.code === "23503") {
            console.debug("Attempted to create thread with anonymous user:", createParticipantsError.message)
            return null
          }
          // For other errors, throw as usual
          throw new MessageHandlerError(
            "Failed to create thread participants",
            "participant_creation",
            createParticipantsError,
          )
        }
      } catch (error: any) {
        // Catch any other potential database errors
        if (error?.code === "23503") {
          console.debug("Attempted to create thread with anonymous user:", error.message)
          return null
        }
        throw error
      }
    }

    // Add message to thread
    const { data: newMessage, error: messageError } = await supabase
      .from("message")
      .insert({
        thread_id: threadId,
        from_user_id: participant1.user_id,
        from_npc_instance_id: participant1.npc_instance_id,
        content: message,
      })
      .select()
      .single()

    if (messageError) {
      throw new MessageHandlerError("Failed to create message", "message_creation", messageError)
    }

    if (!newMessage) {
      throw new MessageHandlerError("Created message returned no data", "message_creation")
    }

    return {
      threadId,
      messageId: newMessage.id,
    }
  } catch (error) {
    if (error instanceof MessageHandlerError) {
      throw error
    }

    throw new MessageHandlerError(
      "Unexpected error in message handler",
      "unknown",
      error instanceof Error ? error : new Error(String(error)),
    )
  }
}

server.listen(CONFIG.SERVER_PORT, () => {
  logger.info(`Server is running on ${CONFIG.SERVER_URL}`)
})
