// Images: the panel <-> worker contract for this feature.
export type ImageSummary = {
  /** sha256:... */
  id: string
  /** "redis:7.4-alpine", ...; empty for a dangling image. */
  tags: string[]
  /** Seconds since the epoch. */
  created: number
}

declare module 'orca' {
  interface PluginRequests {
    'images.list': { output: { images: ImageSummary[] } }
    /** `ref` is a tag ("redis:7.4-alpine") or an image id. */
    'images.inspect': { input: { ref: string }; output: { json: string } }
    /** Removing a tag untags it; the image goes when its last tag does. */
    'images.remove': { input: { ref: string }; output: { ok: true } }
  }
  interface PluginPanelEvents {
    /** An image was pulled, tagged, untagged or deleted. The panel reloads the list. */
    'images.changed': { at: number }
  }
}
