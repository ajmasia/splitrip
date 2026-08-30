/**
 * Checks a page against the two things a phone layout can silently get wrong: content wider than
 * the screen, and controls too small to hit with a thumb.
 *
 * It drives a real browser because neither can be answered from the markup — both are the result of
 * layout. Device metrics are emulated rather than set through the window size: a headless window of
 * 360 pixels does not lay out at 360, which makes a screenshot taken that way disagree with what a
 * phone shows.
 *
 * Run with the dev server up:
 *   npm run check:viewport -- http://localhost:3000/
 */

import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const MINIMUM_TOUCH_TARGET = 44
const DEBUGGING_PORT = 9333

const [, , url = 'http://localhost:3000/', width = '360', height = '760'] = process.argv

const { existsSync } = await import('node:fs')
const chromePath = CHROME_CANDIDATES.find((candidate) => existsSync(candidate))
if (!chromePath) {
  console.error('No Chrome found. Set CHROME_PATH to point at one.')
  process.exit(1)
}

const chrome = spawn(
  chromePath,
  [
    '--headless',
    '--disable-gpu',
    `--remote-debugging-port=${DEBUGGING_PORT}`,
    '--user-data-dir=/tmp/splitrip-viewport-profile',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

async function debuggerUrl() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUGGING_PORT}/json/list`)
      const page = (await response.json()).find((target) => target.type === 'page')
      if (page) return page.webSocketDebuggerUrl
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
await send('Emulation.setDeviceMetricsOverride', {
  width: Number(width),
  height: Number(height),
  deviceScaleFactor: 1,
  mobile: Number(width) < 768,
})
await send('Page.navigate', { url })
await new Promise((resolve) => setTimeout(resolve, 3500))

const { result } = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const doc = document.documentElement
    const describe = (node) => ({
      tag: node.tagName.toLowerCase(),
      className: typeof node.className === 'string' ? node.className.slice(0, 80) : '',
      text: (node.textContent || '').trim().slice(0, 32),
    })
    return {
      viewport: doc.clientWidth,
      scrollWidth: doc.scrollWidth,
      wider: [...document.querySelectorAll('*')]
        .filter((node) => node.getBoundingClientRect().right > doc.clientWidth + 1)
        .slice(0, 8)
        .map(describe),
      small: [...document.querySelectorAll('button, a, input, select, textarea, [role="button"]')]
        .filter((node) => {
          const height = node.getBoundingClientRect().height
          return height > 0 && height < ${MINIMUM_TOUCH_TARGET}
        })
        .slice(0, 8)
        .map(describe),
    }
  })()`,
})

if (process.env.SCREENSHOT) {
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(process.env.SCREENSHOT, Buffer.from(shot.data, 'base64'))
}

socket.close()
chrome.kill()

const { viewport, scrollWidth, wider, small } = result.value
const failures = []

console.log(`Checking ${url} at ${viewport}x${height}`)

if (scrollWidth > viewport) {
  failures.push(`✗ The page is ${scrollWidth}px wide in a ${viewport}px viewport`)
  for (const node of wider) {
    failures.push(`    <${node.tag} class="${node.className}"> ${node.text}`)
  }
} else {
  console.log(`✓ Nothing reaches past the ${viewport}px viewport`)
}

if (small.length > 0) {
  failures.push(`✗ ${small.length} control(s) shorter than ${MINIMUM_TOUCH_TARGET}px`)
  for (const node of small) {
    failures.push(`    <${node.tag} class="${node.className}"> ${node.text}`)
  }
} else {
  console.log(`✓ Every control is at least ${MINIMUM_TOUCH_TARGET}px tall`)
}

if (failures.length > 0) {
  console.error(`\n${failures.join('\n')}`)
  process.exit(1)
}
