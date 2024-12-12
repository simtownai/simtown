import { useState } from "react"

export type AuthContainerState = false | { message: string }

export function useAuthContainerState() {
  const [authContainerState, setAuthContainerState] = useState<AuthContainerState>(false)

  return {
    authContainerState,
    setAuthContainerState,
  }
}
