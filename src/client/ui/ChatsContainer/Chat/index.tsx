import { ChatMessage } from "../../../../shared/types"
import Compose from "./Compose"
import Footer from "./Footer"
import Header from "./Header"
import Message from "./Message"
import styles from "./styles.module.css"
import { FormEvent, useEffect, useRef } from "react"
import { Socket } from "socket.io-client"

export default function Chat({
  socket,
  username,
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
  username: string
  chatmate: string | null
  setChatmate: (value: string | null) => void
  setIsChatsContainerCollapsed: (value: boolean) => void
  setIsChatCollapsed: (value: boolean) => void
  isMobile: boolean
  isExpanded: boolean
  setIsExpanded: (value: boolean) => void
  messages: ChatMessage[]
  setMessages: (value: ChatMessage[]) => void
  composeValue: string
  setComposeValue: (value: string) => void
  isMessageLoading: boolean
  setIsMessageLoading: (value: boolean) => void
  handleClearConversation: (() => void) | null
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom("instant")
  }, [messages])

  function scrollToBottom(behavior: ScrollBehavior) {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior })
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
    const newMessage = {
      from: username,
      to: chatmate,
      message: composeValue,
      date: new Date().toISOString(),
    } as ChatMessage
    const newMessagesUser: ChatMessage[] = [...messages, newMessage]
    setMessages(newMessagesUser)
    socket.emit("sendMessage", newMessage)
    setTimeout(() => {
      scrollToBottom("instant")
    }, 25)
  }

  return (
    <div className={styles.chat}>
      <Header
        isMobile={isMobile}
        text={chatmate || ""}
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
            {messages.map((message, index) => {
              const previousMessage = messages[index - 1]
              const isFirstInGroup = !previousMessage || previousMessage.from !== message.from
              return (
                <Message
                  key={index}
                  message={message}
                  isLoading={isMessageLoading}
                  isFirstInGroup={isFirstInGroup}
                  ifMessageIsFromUser={message.from === username}
                />
              )
            })}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className={styles.placeholder}>Select a chat to start messaging</div>
        )}
      </div>
      {chatmate && !chatmate.endsWith("(broadcast)") && !chatmate.endsWith("(overheard)") && (
        <>
          <Compose
            composeValue={composeValue}
            setComposeValue={setComposeValue}
            isLoading={isMessageLoading}
            onSubmitUserMessage={handleSubmitUserMessage}
            onResizeClick={handleResizeClick}
            isMobile={isMobile}
          />
        </>
      )}
      {false && <Footer />}
    </div>
  )
}
