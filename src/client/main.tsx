/// <reference types="vite/client" />
import App from "./App"
import "./style.css"
import { PostHogProvider } from "posthog-js/react"
import React from "react"
import ReactDOM from "react-dom/client"

ReactDOM.createRoot(document.getElementById("root")!).render(
  //<React.StrictMode>
  <PostHogProvider
    apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
    options={{
      api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
      session_recording: {
        captureCanvas: {
          recordCanvas: true,
          canvasFps: 10,
        },
      },
    }}
  >
    <App />
  </PostHogProvider>,
  // </React.StrictMode>,
)
