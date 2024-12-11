import { useState } from "react"

export function useAuth() {
  const [isAuthContainerExpanded, setAuthContainerExpanded] = useState(false)

  return {
    isAuthContainerExpanded,
    setAuthContainerExpanded,
  }
}
