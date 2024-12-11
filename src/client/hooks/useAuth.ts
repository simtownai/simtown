import { useState } from "react"

export function useAuth() {
  const [isAuthContainerExpanded, setIsAuthContainerExpanded] = useState(false)

  return {
    isAuthContainerExpanded,
    setIsAuthContainerExpanded,
  }
}
