/// <reference types="vite/client" />
import App from "./App"
import "./style.css"
import { PostHogProvider } from "posthog-js/react"
import React from "react"
import ReactDOM from "react-dom/client"

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY} options={options}>
      <App />
    </PostHogProvider>
  </React.StrictMode>,
)
