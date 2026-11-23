// One long-lived /events connection shared by every feature. It sits idle until Docker reports a
// change, so live status costs no polling. Reconnects with backoff if Docker restarts.
import type { DockerClient } from './client'

export type DockerEvent = {
  Type: string
  Action: string
  Actor?: { ID?: string; Attributes?: Record<string, string> }
}
type Listener = (event: DockerEvent) => void

export type EventWatcher = {
  /** Listen for one event type (`container`, `image`, ...). Register before `start`. */
  on(type: string, listener: Listener): void
  /** Opens the stream; later calls do nothing while it runs. */
  start(): void
  stop(): void
}

const MIN_RETRY_MS = 1_000
const MAX_RETRY_MS = 30_000

export function createEventWatcher(docker: DockerClient, log: (message: string) => void): EventWatcher {
  const listeners = new Map<string, Listener[]>()
  let controller: AbortController | null = null

  function dispatch(line: string): void {
    let event: DockerEvent
    try {
      event = JSON.parse(line) as DockerEvent
    } catch {
      return
    }
    for (const listener of listeners.get(event.Type) ?? []) listener(event)
  }

  async function run(signal: AbortSignal): Promise<void> {
    const filters = encodeURIComponent(JSON.stringify({ type: [...listeners.keys()] }))
    let retryMs = MIN_RETRY_MS
    while (!signal.aborted) {
      try {
        await docker.stream(`/events?filters=${filters}`, dispatch, signal)
        retryMs = MIN_RETRY_MS
      } catch (error) {
        if (signal.aborted) return
        log(`events stream: ${error instanceof Error ? error.message : String(error)}`)
      }
      await sleep(retryMs, signal)
      retryMs = Math.min(retryMs * 2, MAX_RETRY_MS)
    }
  }

  return {
    on(type, listener) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener])
    },
    start() {
      if (controller) return
      controller = new AbortController()
      void run(controller.signal)
    },
    stop() {
      controller?.abort()
      controller = null
    }
  }
}

/** Calls `fn` once after `ms` of quiet, so a burst of events (compose up) causes one refresh. */
export function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  return () => {
    clearTimeout(timer)
    timer = setTimeout(fn, ms)
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
  })
}
