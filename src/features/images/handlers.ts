// Images, worker side: turns panel requests into Docker Engine API calls.
import { debounce } from '../../docker/events'
import { DockerError } from '../../docker/errors'
import type { WorkerContext } from '../context'
import { isImageRef, toImageSummary, type RawImage } from './model'

function checkRef(ref: unknown): string {
  if (!isImageRef(ref)) throw new DockerError('Not an image name or id.', 'invalid_params')
  return ref
}

export function registerImages({ orca, docker, events }: WorkerContext): void {
  const changed = debounce(() => orca.panels.post('images.changed', { at: Date.now() }), 300)
  events.on('image', changed)

  orca.panels.handle('images.list', async (_input, { signal }) => {
    events.start()
    const raw = await docker.get<RawImage[]>('/images/json', signal)
    return { images: raw.map(toImageSummary) }
  })

  orca.panels.handle('images.inspect', async ({ ref }, { signal }) => {
    const json = await docker.text(`/images/${checkRef(ref)}/json`, signal)
    return { json: JSON.stringify(JSON.parse(json), null, 2) }
  })

  // No force: Docker refuses (409) while a container uses the image, and the panel shows why.
  orca.panels.handle('images.remove', async ({ ref }, { signal }) => {
    await docker.delete(`/images/${checkRef(ref)}`, signal)
    return { ok: true as const }
  })
}
