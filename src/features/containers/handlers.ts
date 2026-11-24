// Containers, worker side: turns panel requests into Docker Engine API calls.
import { debounce } from '../../docker/events'
import { DockerError } from '../../docker/errors'
import type { WorkerContext } from '../context'
import { openLogsTerminal } from '../logs-terminal'
import { isContainerId, toSummary, type RawContainer } from './model'
import type { ContainerAction } from './types'

const ACTIONS: readonly ContainerAction[] = ['start', 'stop', 'restart']

function checkId(id: unknown): string {
  if (!isContainerId(id)) throw new DockerError('Not a container id.', 'invalid_params')
  return id
}

export function registerContainers({ orca, docker, events }: WorkerContext): void {
  const changed = debounce(() => orca.panels.post('containers.changed', { at: Date.now() }), 300)
  events.on('container', changed)

  orca.panels.handle('containers.list', async (_input, { signal }) => {
    events.start()
    const raw = await docker.get<RawContainer[]>('/containers/json?all=1', signal)
    return { containers: raw.map(toSummary) }
  })

  orca.panels.handle('containers.action', async ({ id, action }, { signal }) => {
    if (!ACTIONS.includes(action)) throw new DockerError(`Unknown action ${String(action)}.`, 'invalid_params')
    await docker.post(`/containers/${checkId(id)}/${action}`, signal)
    return { ok: true as const }
  })

  orca.panels.handle('containers.remove', async ({ id, force }, { signal }) => {
    await docker.delete(`/containers/${checkId(id)}?force=${force ? 1 : 0}`, signal)
    return { ok: true as const }
  })

  orca.panels.handle('containers.inspect', async ({ id }, { signal }) => {
    const json = await docker.text(`/containers/${checkId(id)}/json`, signal)
    return { json: JSON.stringify(JSON.parse(json), null, 2) }
  })

  // Logs run in an Orca terminal, like Cursor's "View Logs": the panel never holds log text.
  orca.panels.handle('containers.logs', async ({ id, name }) => {
    const safeId = checkId(id)
    return openLogsTerminal(orca, `container:${safeId}`, `logs: ${String(name)}`, `docker logs -f --tail 200 ${safeId}`)
  })
}
