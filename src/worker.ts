// Worker entry. Orca starts it on the panel's first request and runs it in Node. It only wires the
// Docker client to each feature; the features hold the logic.
import type { OrcaWorkerApi } from 'orca/worker'
import { createDockerClient } from './docker/client'
import { resolveEndpoint } from './docker/endpoint'
import { createEventWatcher, type EventWatcher } from './docker/events'
import type { WorkerContext } from './features/context'
import { registerCompose } from './features/containers/compose'
import { registerContainers } from './features/containers/handlers'
import { registerImages } from './features/images/handlers'

/** Add a feature here (and its section in src/panel/main.ts). */
const FEATURES: ((context: WorkerContext) => void)[] = [registerContainers, registerCompose, registerImages]

let watcher: EventWatcher | null = null

export default function activate(orca: OrcaWorkerApi): void {
  const docker = createDockerClient(resolveEndpoint())
  const events = createEventWatcher(docker, (message) => orca.log(message))
  watcher = events
  const context: WorkerContext = { orca, docker, events }
  for (const register of FEATURES) register(context)

  orca.panels.handle('docker.ping', async (_input, { signal }) => {
    try {
      await docker.text('/_ping', signal)
      events.start()
      return { reachable: true }
    } catch (error) {
      return { reachable: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
}

export function deactivate(): void {
  watcher?.stop()
  watcher = null
}
