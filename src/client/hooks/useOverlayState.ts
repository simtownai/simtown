import { useState } from "react"

export function useOverlayState() {
  const [isChatsContainerCollapsed, setIsChatsContainerCollapsed] = useState(true)
  const [isChatCollapsed, setIsChatCollapsed] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isNewsContainerCollapsed, setIsNewsContainerCollapsed] = useState(true)
  const [isObserveContainerCollapsed, setIsObserveContainerCollapsed] = useState(true)
  const [isObservedNPCCollapsed, setIsObservedNPCCollapsed] = useState(true)
  const [isObservedContainerExpanded, setIsObservedContainerExpanded] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem("soundEnabled") === "true")

  return {
    isChatsContainerCollapsed,
    setIsChatsContainerCollapsed,
    isChatCollapsed,
    setIsChatCollapsed,
    isExpanded,
    setIsExpanded,
    isNewsContainerCollapsed,
    setIsNewsContainerCollapsed,
    isObserveContainerCollapsed,
    setIsObserveContainerCollapsed,
    isObservedNPCCollapsed,
    setIsObservedNPCCollapsed,
    isObservedContainerExpanded,
    setIsObservedContainerExpanded,
    soundEnabled,
    setSoundEnabled,
  }
}
