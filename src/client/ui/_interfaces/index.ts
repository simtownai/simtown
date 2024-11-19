type Locale = "en-US" | "ru-RU"

interface Localization {
  clear: string
  collapse: string
  resize: string
  send: string
  inputPlaceholder: string
  errorMessage: string
}

export type Localizations = {
  [key in Locale]: Localization
}

declare global {
  interface Window {
    askguruQueryParams?: URLSearchParams
  }
}
