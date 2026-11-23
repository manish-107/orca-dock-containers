// What every feature's worker side gets. A feature registers its own handlers and event listeners
// from this, so adding a feature never touches another one.
import type { OrcaWorkerApi } from 'orca/worker'
import type { DockerClient } from '../docker/client'
import type { EventWatcher } from '../docker/events'

export type WorkerContext = {
  orca: OrcaWorkerApi
  docker: DockerClient
  events: EventWatcher
}
