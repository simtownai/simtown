import { ChatMessage } from "../../../shared/types"
import { MessageType } from "../_interfaces"
import AskguruApi from "../_lib/api"
import { defaultAskguruConfiguration as askguruConfiguration, defaultConfiguration } from "../configuration"
import Compose from "./Compose"
import Footer from "./Footer"
import Header from "./Header"
import Message from "./Message"
import styles from "./styles.module.css"
import { FormEvent, useEffect, useRef } from "react"
import { Socket } from "socket.io-client"

const chatScreenIndent = 20

export default function Chat({
  socket,
  chatmate,
  setIsCollapsed,
  isMobile,
  isExpanded,
  setIsExpanded,
  messages,
  setMessages,
  composeValue,
  setComposeValue,
  isMessageLoading,
  setIsMessageLoading,
  handleClearConversation,
}: {
  socket: Socket
  chatmate: string
  setIsCollapsed: (value: boolean) => void
  isMobile: boolean
  isExpanded: boolean
  setIsExpanded: (value: boolean) => void
  messages: MessageType[]
  setMessages: (value: MessageType[]) => void
  composeValue: string
  setComposeValue: (value: string) => void
  isMessageLoading: boolean
  setIsMessageLoading: (value: boolean) => void
  handleClearConversation: (() => void) | null
}) {
  const configuration = {
    ...defaultConfiguration,
    windowHeading: chatmate,
  }
  const askguruAPI = new AskguruApi({ askguruConfiguration })
  const regexPattern = new RegExp(askguruAPI.sourcePattern)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCollapsed(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [setIsCollapsed])

  function scrollToBottom() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  function handleCollapseButtonClick() {
    setIsCollapsed(true)
  }

  function handleResizeClick() {
    setIsExpanded(!isExpanded)
  }

  function handleSubmitUserMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setComposeValue("")
    const newMessagesUser: MessageType[] = [...messages, { role: "user", content: composeValue }]
    setMessages(newMessagesUser)
    socket.emit("sendMessage", { from: socket.id, to: chatmate, message: composeValue } as ChatMessage)

    // const newMessagesAssistant: MessageType[] = [...newMessagesUser, { role: "assistant", content: "" }]
    // setMessages(newMessagesAssistant)
    // setIsMessageLoading(true)
    // let completeAnswer = ""
    // let newMessages: MessageType[] = [...newMessagesAssistant]
    // newMessages[newMessagesAssistant.length - 1].content = completeAnswer
    // setMessages(newMessages)
    // setIsMessageLoading(false)

    // localStorage.setItem(`askguru-chat-history-${configuration.token}`, JSON.stringify(newMessagesUser))
    setTimeout(() => {
      scrollToBottom()
    }, 25)
  }

  return (
    <div
      className={`${styles.chat} ${
        isMobile
          ? styles.chatMobile
          : `${styles.chatDesktop} ${isExpanded ? styles.chatDesktopExpanded : styles.chatDesktopNormal}`
      }`}
      style={{
        bottom: isMobile ? 0 : configuration.bottomIndent + configuration.buttonSize + configuration.buttonSize / 8,
        right: isMobile ? 0 : configuration.rightIndent,
        borderRadius: isMobile ? "0px" : "16px",
        zIndex: configuration.zIndex,
        width: isMobile
          ? "100%"
          : isExpanded
            ? `calc(100vw - ${configuration.rightIndent + chatScreenIndent}px)`
            : "450px",
        height: isMobile
          ? "100%"
          : isExpanded
            ? `calc(100vh - ${
                configuration.bottomIndent + configuration.buttonSize + configuration.buttonSize / 8 + chatScreenIndent
              }px)`
            : "650px",
        maxWidth: isMobile ? "unset" : `calc(100vw - ${configuration.rightIndent + chatScreenIndent}px)`,
        maxHeight: isMobile
          ? "unset"
          : `calc(100vh - ${
              configuration.bottomIndent + configuration.buttonSize + configuration.buttonSize / 8 + chatScreenIndent
            }px)`,
      }}
    >
      <Header
        configuration={configuration}
        onClearButtonClick={handleClearConversation}
        isMobile={isMobile}
        onCollapseButtonClick={handleCollapseButtonClick}
      />
      <div className={styles.content}>
        {messages.map((message, index) => {
          return (
            <Message
              key={index}
              message={message}
              selectedColor={"#" + configuration.color}
              isFirst={index === 0}
              isLast={messages.length - 1 === index}
              isLoading={isMessageLoading}
              askguruAPI={askguruAPI}
            />
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      <Compose
        inputRef={inputRef}
        configuration={configuration}
        composeValue={composeValue}
        setComposeValue={setComposeValue}
        isLoading={isMessageLoading}
        onSubmitUserMessage={handleSubmitUserMessage}
        onResizeClick={handleResizeClick}
        isMobile={isMobile}
      />
      {!configuration.whitelabel && <Footer />}
    </div>
  )
}
