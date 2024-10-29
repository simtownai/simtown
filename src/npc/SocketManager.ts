import {
  BroadcastMessage,
  ChatMessage,
  NewsItem,
  PlayerData,
  PlayerSpriteDefinition,
  UpdatePlayerData,
} from "../shared/types"
import { Socket, io } from "socket.io-client"

export type EmitInterface = {
  emitSendMessage: (message: ChatMessage) => void
  emitEndConversation: (message: ChatMessage) => void
  emitBroadcast: (message: BroadcastMessage) => void
  emitNewsItem: (newsItem: NewsItem) => void
  updatePlayerData: (data: UpdatePlayerData) => void
  setListener: (event: string, listener: (...args: any[]) => void) => void
  removeListener: (event: string, listener: (...args: any[]) => void) => void
}

export type SocketManagerConfig = {
  username: string
  spriteDefinition: PlayerSpriteDefinition
  onPlayerDataChanged: (player: PlayerData) => void
  setupPlayers: (players: PlayerData[], socketId: string) => void
  onPlayerJoined: (player: PlayerData) => void
  onEndConversation: (message: ChatMessage) => void
  onPlayerLeft: (username: string) => void
  onNewMessage: (message: ChatMessage) => void
  onNews: (news: NewsItem | NewsItem[]) => void
}

export class SocketManager {
  private socket: Socket
  private onEndConversation: (message: ChatMessage) => void
  private onPlayerDataChanged: (player: PlayerData) => void
  private onPlayerJoined: (player: PlayerData) => void
  private setupPlayers: (players: PlayerData[], socketId: string) => void
  private onPlayerLeft: (username: string) => void
  private onNewMessage: (message: ChatMessage) => void
  private onNews: (news: NewsItem | NewsItem[]) => void
  constructor(args: SocketManagerConfig) {
    this.socket = io("http://localhost:3000", { autoConnect: false })
    this.setupPlayers = args.setupPlayers
    this.onPlayerJoined = args.onPlayerJoined
    this.onEndConversation = args.onEndConversation
    this.onPlayerLeft = args.onPlayerLeft
    this.onPlayerDataChanged = args.onPlayerDataChanged
    this.onNewMessage = args.onNewMessage
    this.onNews = args.onNews
    setTimeout(() => {
      this.setupSocketEvents()
      this.socket.connect()
      this.socket.emit("joinGame", true, args.username, args.spriteDefinition)
    }, 7000)
  }

  private setupSocketEvents() {
    this.socket.on("connect", () => {
      const socketId = this.socket.id!
      this.socket.on("existingPlayers", (players: PlayerData[]) => {
        this.setupPlayers(players, socketId)
      })

      this.socket.on("playerJoined", (player: PlayerData) => {
        this.onPlayerJoined(player)
      })

      this.socket.on("playerDataChanged", (player: PlayerData) => {
        this.onPlayerDataChanged(player)
      })

      this.socket.on("endConversation", (message: ChatMessage) => {
        this.onEndConversation(message)
      })

      this.socket.on("playerLeft", (username: string) => {
        this.onPlayerLeft(username)
      })

      // Listen for incoming messages
      this.socket.on("newMessage", async (message: ChatMessage) => {
        this.onNewMessage(message)
      })

      this.socket.on("news", (news: NewsItem | NewsItem[]) => {
        this.onNews(news)
      })
    })
  }

  emitUpdatePlayerData(data: UpdatePlayerData) {
    this.socket.emit("updatePlayerData", data)
  }
  emitEndConversation(message: ChatMessage) {
    this.socket.emit("endConversation", message)
  }
  emitSendMessage(message: ChatMessage) {
    this.socket.emit("sendMessage", message)
  }
  emitBroadcast(message: BroadcastMessage) {
    this.socket.emit("broadcast", message)
  }
  emitNewsItem(newsItem: NewsItem) {
    this.socket.emit("sendNews", newsItem)
  }
  setListener(event: string, listener: (...args: any[]) => void) {
    this.socket.on(event, listener)
  }
  removeListener(event: string, listener: (...args: any[]) => void) {
    this.socket.off(event, listener)
  }

  getEmitMethods = (): EmitInterface => {
    return {
      emitSendMessage: (message: ChatMessage) => this.emitSendMessage(message),
      emitBroadcast: (message: BroadcastMessage) => this.emitBroadcast(message),
      emitEndConversation: (message: ChatMessage) => this.emitEndConversation(message),
      emitNewsItem: (newsItem: NewsItem) => this.emitNewsItem(newsItem),
      updatePlayerData: (data: UpdatePlayerData) => this.emitUpdatePlayerData(data),
      setListener: (event: string, listener: (...args: any[]) => void) => this.setListener(event, listener),
      removeListener: (event: string, listener: (...args: any[]) => void) => this.removeListener(event, listener),
    }
  }
}
