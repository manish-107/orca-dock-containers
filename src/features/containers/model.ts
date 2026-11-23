// Plain functions shared by the worker and the panel: no Docker calls, no DOM.
import type { ContainerAction, ContainerSummary } from './types'

/** The fields of GET /containers/json this plugin reads. */
export type RawContainer = {
  Id: string
  Names?: string[] | null
  Image: string
  State: string
  Status: string
  Labels?: Record<string, string> | null
}

export const PROJECT_LABEL = 'com.docker.compose.project'
export const NO_PROJECT_LABEL = 'Individual Containers'

export function toSummary(raw: RawContainer): ContainerSummary {
  const name = raw.Names?.[0]?.replace(/^\//, '') ?? raw.Id.slice(0, 12)
  return {
    id: raw.Id,
    name,
    image: raw.Image,
    state: raw.State,
    status: raw.Status,
    project: raw.Labels?.[PROJECT_LABEL] || null
  }
}

/** `project` is null for the "Individual Containers" group. */
export type ContainerGroup = { key: string; label: string; project: string | null; containers: ContainerSummary[] }

/** Compose projects A–Z, then containers without a project, as Cursor's Docker view shows them. */
export function groupByProject(containers: readonly ContainerSummary[]): ContainerGroup[] {
  const groups = new Map<string, ContainerSummary[]>()
  for (const container of containers) {
    const key = container.project ?? ''
    groups.set(key, [...(groups.get(key) ?? []), container])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
    .map(([key, list]) => ({
      key: key === '' ? 'container-group:none' : `container-group:${key}`,
      label: key === '' ? NO_PROJECT_LABEL : key,
      project: key === '' ? null : key,
      containers: [...list].sort((a, b) => a.image.localeCompare(b.image))
    }))
}

export type Tone = 'ok' | 'bad' | 'warn'

export function toneOf(container: ContainerSummary): Tone {
  if (container.state === 'running') return /\(unhealthy\)/.test(container.status) ? 'warn' : 'ok'
  if (container.state === 'paused' || container.state === 'restarting') return 'warn'
  return 'bad'
}

/** Start for a stopped container; Stop and Restart for a running one. */
export function actionsFor(container: ContainerSummary): ContainerAction[] {
  return container.state === 'running' || container.state === 'restarting' || container.state === 'paused'
    ? ['stop', 'restart']
    : ['start']
}

/** Compose project names: lowercase letters, digits, dashes and underscores. */
const PROJECT_NAME = /^[a-z0-9][a-z0-9_-]{0,127}$/

export function isProjectName(value: unknown): value is string {
  return typeof value === 'string' && PROJECT_NAME.test(value)
}

/**
 * `docker compose` arguments for a project by name alone. `--project-directory /` stops compose
 * from loading an unrelated compose.yaml in the current folder, so it acts only on the project's
 * existing containers.
 */
export function composeArgs(project: string, ...command: string[]): string[] {
  return ['compose', '--project-directory', '/', '-p', project, ...command]
}

const CONTAINER_ID = /^[0-9a-f]{12,64}$/

export function isContainerId(value: unknown): value is string {
  return typeof value === 'string' && CONTAINER_ID.test(value)
}
