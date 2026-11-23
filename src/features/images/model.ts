// Plain functions shared by the worker and the panel: no Docker calls, no DOM.
import type { ImageSummary } from './types'

/** The fields of GET /images/json this plugin reads. */
export type RawImage = { Id: string; RepoTags?: string[] | null; Created: number }

const NONE = '<none>:<none>'

export function toImageSummary(raw: RawImage): ImageSummary {
  return { id: raw.Id, tags: (raw.RepoTags ?? []).filter((tag) => tag !== NONE), created: raw.Created }
}

/** "ghcr.io/org/app:1.0" -> repo "ghcr.io/org/app", tag "1.0". A port in the registry is not a tag. */
export function splitRef(ref: string): { repo: string; tag: string } {
  const colon = ref.lastIndexOf(':')
  if (colon > ref.lastIndexOf('/')) return { repo: ref.slice(0, colon), tag: ref.slice(colon + 1) }
  return { repo: ref, tag: 'latest' }
}

/** Full name the way Cursor shows it: "redis" -> "docker.io/library/redis". */
export function fullRepoName(repo: string): string {
  const first = repo.split('/')[0]
  const hasRegistry = repo.includes('/') && (first.includes('.') || first.includes(':') || first === 'localhost')
  if (hasRegistry) return repo
  return repo.includes('/') ? `docker.io/${repo}` : `docker.io/library/${repo}`
}

export type ImageTag = { key: string; ref: string; label: string; created: number }
export type ImageRepo = { key: string; label: string; tags: ImageTag[] }

export const DANGLING_LABEL = '<none>'

/** Repos A–Z with their tags newest first; untagged images last under "<none>". */
export function groupByRepo(images: readonly ImageSummary[]): ImageRepo[] {
  const repos = new Map<string, ImageTag[]>()
  const add = (label: string, tag: ImageTag) => repos.set(label, [...(repos.get(label) ?? []), tag])
  for (const image of images) {
    if (image.tags.length === 0) {
      add(DANGLING_LABEL, { key: `image:${image.id}`, ref: image.id, label: shortId(image.id), created: image.created })
      continue
    }
    for (const ref of image.tags) {
      const { repo, tag } = splitRef(ref)
      add(fullRepoName(repo), { key: `image:${ref}`, ref, label: tag, created: image.created })
    }
  }
  return [...repos.entries()]
    .sort(([a], [b]) => (a === DANGLING_LABEL ? 1 : b === DANGLING_LABEL ? -1 : a.localeCompare(b)))
    .map(([label, tags]) => ({
      key: `image-repo:${label}`,
      label,
      tags: [...tags].sort((a, b) => b.created - a.created)
    }))
}

export function shortId(id: string): string {
  return id.replace(/^sha256:/, '').slice(0, 12)
}

const UNITS: [string, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60]
]

/** "4 years ago", "3 months ago", "just now". */
export function timeAgo(seconds: number, nowSeconds: number): string {
  const diff = Math.max(0, nowSeconds - seconds)
  for (const [unit, size] of UNITS) {
    const count = Math.floor(diff / size)
    if (count >= 1) return `${count} ${unit}${count === 1 ? '' : 's'} ago`
  }
  return 'just now'
}

/** Tags, digests and ids only: letters, digits and . _ - / : @ */
const IMAGE_REF = /^[A-Za-z0-9][A-Za-z0-9._\-/:@]{0,255}$/

export function isImageRef(value: unknown): value is string {
  return typeof value === 'string' && IMAGE_REF.test(value) && !value.includes('..')
}
