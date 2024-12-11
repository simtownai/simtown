import { useState } from "react"

export type AuthState = false | string

export function useAuth() {
  const [authState, setAuthContainerExpanded] = useState<AuthState>(false)

  return {
    authState,
    setAuthContainerExpanded,
  }
}
