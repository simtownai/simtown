import { CONFIG } from "../../../shared/config"
import { supabase } from "../../supabase"
import Header from "../OverlayHeader"
import styles from "./styles.module.css"
import { Auth } from "@supabase/auth-ui-react"
import { ThemeSupa } from "@supabase/auth-ui-shared"

interface AuthorizeProps {
  redirectTo: string
  isMobile: boolean
  onClose: () => void
}

export default function Authorize({ redirectTo, isMobile, onClose }: AuthorizeProps) {
  const containerStyle = !isMobile
    ? {
        width: "450px",
        height: "650px",
        maxWidth: "calc(100vw - 40px)",
        maxHeight: "calc(100vh - 40px)",
      }
    : {}

  return (
    <div
      className={`${styles.authcontainer} ${isMobile ? styles.mobileContainer : styles.desktopContainer}`}
      style={containerStyle}
    >
      <Header
        isMobile={isMobile}
        text="Login"
        onCollapseButtonClick={onClose}
        onBackButtonClick={null}
        onClearButtonClick={null}
      />
      <div className={styles.content}>
        <center>
          <h1>Simtown</h1>
        </center>
        <Auth
          supabaseClient={supabase}
          providers={["google"]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "#e1af74",
                  brandAccent: "#e2b57e",
                  brandButtonText: "#522e02",
                  defaultButtonBackground: "#48331c",
                  defaultButtonBackgroundHover: "#6c4a2b",
                  inputBackground: "#6c4a2b",
                  inputBorder: "#48331c",
                  inputText: "#ffffff",
                  inputPlaceholder: "#a68868",
                },
                fonts: {
                  bodyFontFamily: CONFIG.FONT_FAMILY,
                  buttonFontFamily: CONFIG.FONT_FAMILY,
                  inputFontFamily: CONFIG.FONT_FAMILY,
                  labelFontFamily: CONFIG.FONT_FAMILY,
                },
              },
            },
            style: {
              button: {
                border: "1px solid #48331c",
                color: "#ffffff",
                fontSize: "1.2rem",
              },
              anchor: {
                color: "#e2b57e",
                fontSize: "1.2rem",
              },
              label: {
                color: "#ffffff",
                fontSize: "1.2rem",
              },
              input: {
                fontSize: "1.2rem",
              },
            },
          }}
          redirectTo={redirectTo}
        />
      </div>
    </div>
  )
}
