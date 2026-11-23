// Panel entry. Orca compiles this TypeScript when the panel loads; there is no build step.
import { containersSection } from '../features/containers/view'
import { imagesSection } from '../features/images/view'
import { mountSection, type Section } from '../ui/section'

/** Add a feature's section here (and its handlers in src/worker.ts). */
const SECTIONS = [containersSection(), imagesSection()]

/** Keeps the worker alive while the panel is visible; Orca stops it ~5 minutes after the last call. */
const PING_MS = 2 * 60_000

const root = document.getElementById('sections') as HTMLElement
const banner = document.getElementById('banner') as HTMLElement
const sections: Section[] = SECTIONS.map(mountSection)
root.append(...sections.map((section) => section.element))

let reachable = true

async function ping(): Promise<void> {
  try {
    const answer = await orca.plugin.request('docker.ping')
    const wasDown = !reachable
    reachable = answer.reachable
    banner.hidden = answer.reachable
    banner.textContent = answer.reachable ? '' : (answer.error ?? 'Docker is not reachable.')
    if (wasDown && answer.reachable) reloadOpen()
  } catch (error) {
    banner.hidden = false
    banner.textContent = error instanceof Error ? error.message : String(error)
  }
}

function reloadOpen(): void {
  for (const section of sections) if (section.isOpen()) section.reload()
}

void ping()
setInterval(() => {
  if (document.visibilityState === 'visible') void ping()
}, PING_MS)

// Hidden for a while: the worker (and its event stream) may have stopped, so catch up on return.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return
  void ping()
  reloadOpen()
})
