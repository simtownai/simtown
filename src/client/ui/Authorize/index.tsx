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
        appearance={{ theme: ThemeSupa }}
        redirectTo={redirectTo}
        // onlyThirdPartyProviders={true}
      />
    </div>
  )
}
