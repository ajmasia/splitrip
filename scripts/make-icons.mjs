/**
 * Renders the application icon into the PNG sizes the home screens want.
 *
 * The drawing lives once, in `src/app/icon.svg`, and this rasterises it: an icon kept as four
 * separate hand-made bitmaps drifts the first time somebody adjusts the artwork. Chrome does the
 * rendering because it is already a dependency of `check:viewport` and because it is the same
 * engine that will display the result.
 *
 * The maskable variant is the same drawing at 72% on a filled ground: Android crops an icon to
 * whatever shape the launcher uses, and anything outside the middle circle may not survive it. The
 * Apple one is filled too, because iOS masks a square it expects to be opaque.
 *
 *   npm run icons
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('..', import.meta.url)
const SOURCE = fileURLToPath(new URL('src/app/icon.svg', root))
const BRAND = '#1f5b4e'
const DEBUGGING_PORT = 9334

// `ground` fills the square behind the drawing. The two plain icons leave it out, so their rounded
// corners are empty and a launcher's own background shows through. The maskable one and the Apple
// one need it: Android crops to whatever shape the launcher uses, and iOS applies its own mask to a
// square it expects to be opaque — a transparent corner there comes out black.
const OUTPUTS = [
  { file: 'public/icon-192.png', size: 192, scale: 1, ground: false },
  { file: 'public/icon-512.png', size: 512, scale: 1, ground: false },
  { file: 'public/icon-maskable-512.png', size: 512, scale: 0.72, ground: true },
  { file: 'src/app/apple-icon.png', size: 180, scale: 1, ground: true },
]

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const chromePath = CHROME_CANDIDATES.find((candidate) => existsSync(candidate))
if (!chromePath) {
  console.error('No Chrome found. Set CHROME_PATH to point at one.')
  process.exit(1)
}

const svg = readFileSync(SOURCE, 'utf8')
const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

const page = (size, scale, ground) =>
  `data:text/html;base64,${Buffer.from(
    `
<!doctype html><meta charset="utf-8">
<style>
  html, body { margin: 0; }
  body {
    width: ${size}px; height: ${size}px;
    display: flex; align-items: center; justify-content: center;
    background: ${ground ? BRAND : 'transparent'};
  }
  img { width: ${Math.round(size * scale)}px; height: ${Math.round(size * scale)}px; }
</style>
<img src="${dataUrl}">
`,
  ).toString('base64')}`

const chrome = spawn(
  chromePath,
  [
    '--headless',
    '--disable-gpu',
    `--remote-debugging-port=${DEBUGGING_PORT}`,
    '--user-data-dir=/tmp/splitrip-icon-profile',
    '--hide-scrollbars',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

async function debuggerUrl() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUGGING_PORT}/json/list`)
      const target = (await response.json()).find((entry) => entry.type === 'page')
      if (target) return target.webSocketDebuggerUrl
    } catch {
      // Chrome is not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('Chrome never opened its debugging port')
}

const socket = new WebSocket(await debuggerUrl())
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }))

let nextId = 0
const pending = new Map()
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  const settle = pending.get(message.id)
  if (settle) {
    pending.delete(message.id)
    settle(message.result)
  }
})

function send(method, params = {}) {
  const id = (nextId += 1)
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve) => pending.set(id, resolve))
}

await send('Page.enable')
// Without this the rounded corners come out white rather than empty, and a launcher with a dark
// background shows the icon sitting on a pale square.
await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
mkdirSync(fileURLToPath(new URL('public', root)), { recursive: true })

for (const { file, size, scale, ground } of OUTPUTS) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: size,
    height: size,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await send('Page.navigate', { url: page(size, scale, ground) })
  await new Promise((resolve) => setTimeout(resolve, 400))

  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  const path = fileURLToPath(new URL(file, root))
  writeFileSync(path, Buffer.from(shot.data, 'base64'))
  console.log(`${file}  ${size}x${size}`)
}

socket.close()
chrome.kill()
