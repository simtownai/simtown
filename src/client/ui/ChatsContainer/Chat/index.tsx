import { ChatMessage } from "../../../../shared/types"
import { MessageType } from "../../_interfaces"
import AskguruApi from "../../_lib/api"
import { defaultAskguruConfiguration as askguruConfiguration, defaultConfiguration } from "../../configuration"
import Compose from "./Compose"
import Footer from "./Footer"
import Header from "./Header"
import Message from "./Message"
import styles from "./styles.module.css"
import { FormEvent, useEffect, useRef } from "react"
import { Socket } from "socket.io-client"

export default function Chat({
  socket,
  chatmate,
  setChatmate,
  setIsChatsContainerCollapsed,
  setIsChatCollapsed,
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
  chatmate: string | null
  setChatmate: (value: string | null) => void
  setIsChatsContainerCollapsed: (value: boolean) => void
  setIsChatCollapsed: (value: boolean) => void
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
    windowHeading: chatmate || "",
  }
  const askguruAPI = new AskguruApi({ askguruConfiguration })
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

  function scrollToBottom() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  function handleCollapseButtonClick() {
    setIsChatsContainerCollapsed(true)
  }

  function handleResizeClick() {
    setIsExpanded(!isExpanded)
  }

  function handleSubmitUserMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setComposeValue("")
    const newMessage = { role: "user", content: composeValue, date: new Date().toISOString() } as MessageType
    const newMessagesUser: MessageType[] = [...messages, newMessage]
    setMessages(newMessagesUser)
    socket.emit("sendMessage", {
      from: socket.id,
      to: chatmate,
      message: composeValue,
      date: newMessage.date,
    } as ChatMessage)

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
    <div className={styles.chat}>
      <Header
        isMobile={isMobile}
        text={configuration.windowHeading}
        onCollapseButtonClick={handleCollapseButtonClick}
        onBackButtonClick={
          isMobile
            ? () => {
                setIsChatCollapsed(true)
                setChatmate(null)
              }
            : null
        }
        onClearButtonClick={handleClearConversation}
      />
      <div className={styles.content}>
        {chatmate ? (
          <>
            {messages.map((message, index) => (
              <Message
                key={index}
                message={message}
                selectedColor={"#" + configuration.color}
                isFirst={index === 0}
                isLast={messages.length - 1 === index}
                isLoading={isMessageLoading}
                askguruAPI={askguruAPI}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className={styles.placeholder}>Select a chat to start messaging</div>
        )}
      </div>
      {chatmate && (
        <>
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
        </>
      )}
      {!configuration.whitelabel && <Footer />}
    </div>
  )
}
