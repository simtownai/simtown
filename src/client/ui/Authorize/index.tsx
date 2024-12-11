import { supabase } from "../../supabase"
import styles from "./styles.module.css"
import { Auth } from "@supabase/auth-ui-react"
import { ThemeSupa } from "@supabase/auth-ui-shared"

export default function Authorize({ redirectTo }: { redirectTo: string }) {
  return (
    <div className={styles.authcontainer}>
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
                brand: '#e1af74',
                brandAccent: '#e2b57e',
                brandButtonText: '#522e02',
                defaultButtonBackground: '#48331c',
                defaultButtonBackgroundHover: '#6c4a2b',
                inputBackground: '#6c4a2b',
                inputBorder: '#48331c',
                inputText: '#ffffff',
                inputPlaceholder: '#a68868',
              },
              fonts: {
                bodyFontFamily: `"Monogram Extended", Arial, sans-serif`,
                buttonFontFamily: `"Monogram Extended", Arial, sans-serif`,
                inputFontFamily: `"Monogram Extended", Arial, sans-serif`,
                labelFontFamily: `"Monogram Extended", Arial, sans-serif`,
              },
            },
          },
          style: {
            button: {
              border: '1px solid #48331c',
              color: '#ffffff',
              fontSize: '1.2rem',
            },
            anchor: {
              color: '#e2b57e',
              fontSize: '1.2rem',
            },
            label: {
              color: '#ffffff',
              fontSize: '1.2rem',
            },
            input: {
              fontSize: '1.2rem',
            },
          },
        }}
        redirectTo={redirectTo}
      />
    </div>
  )
}
