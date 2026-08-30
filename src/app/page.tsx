import { createSupabaseServerClient } from '@/lib/supabase/server'
import { APP_VERSION } from '@/lib/version'

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main>
      <h1>Splitrip</h1>
      <p>Gastos de viaje compartidos, cuadrados en un momento.</p>
      {user ? (
        <p>
          Este dispositivo ya tiene identidad: <code>{user.id}</code>
        </p>
      ) : (
        <p>Este dispositivo aún no tiene identidad.</p>
      )}
      <footer>v{APP_VERSION}</footer>
    </main>
  )
}
