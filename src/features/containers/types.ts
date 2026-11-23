// Containers: the panel <-> worker contract for this feature.
export type ContainerSummary = {
  /** Full 64-character id. */
  id: string
  name: string
  image: string
  /** running, exited, paused, restarting, created, dead, removing */
  state: string
  /** Docker's own text, e.g. "Up 5 hours (healthy)" or "Exited (0) 7 weeks ago". */
  status: string
  /** Compose project label, or null for a container started on its own. */
  project: string | null
}

export type ContainerAction = 'start' | 'stop' | 'restart'

/** Right-click on a Compose project group. `down` removes its containers and networks, not volumes. */
export type ComposeAction = 'start' | 'stop' | 'restart' | 'down'

declare module 'orca' {
  interface PluginRequests {
    'containers.list': { output: { containers: ContainerSummary[] } }
    'containers.action': { input: { id: string; action: ContainerAction }; output: { ok: true } }
    /** `force` stops a running container first. */
    'containers.remove': { input: { id: string; force: boolean }; output: { ok: true } }
    /** `docker inspect` as pretty-printed JSON. */
    'containers.inspect': { input: { id: string }; output: { json: string } }
    /** Opens an Orca terminal following the container's logs. */
    'containers.logs': { input: { id: string; name: string }; output: { terminalId: string } }
    /** Runs `docker compose -p <project> <action>`; compose keeps the start/stop order. */
    'compose.action': { input: { project: string; action: ComposeAction }; output: { ok: true } }
    /** Opens an Orca terminal following the logs of every service in the project. */
    'compose.logs': { input: { project: string }; output: { terminalId: string } }
  }
  interface PluginPanelEvents {
    /** A container started, stopped, was created or removed. The panel reloads the list. */
    'containers.changed': { at: number }
  }
}
