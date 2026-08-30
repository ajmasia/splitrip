import { APP_VERSION } from '@/lib/version'

export default function HomePage() {
  return (
    <main>
      <h1>Splitrip</h1>
      <p>Shared travel expenses, settled in seconds.</p>
      <footer>v{APP_VERSION}</footer>
    </main>
  )
}
