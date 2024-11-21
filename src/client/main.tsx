import App from "./App"
import "./style.css"
import posthog from "posthog-js"
import React from "react"
import ReactDOM from "react-dom/client"

posthog.init("phc_zsXZZdjyYnsaJHkTLE66nFDoaYVR5OEfVivZ20WCpsQ", {
  api_host: "https://us.i.posthog.com",
  person_profiles: "identified_only", // or 'always' to create profiles for anonymous users as well
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
