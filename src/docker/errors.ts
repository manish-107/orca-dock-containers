// Errors the panel can show. `code` is an Orca host error code, so it reaches the panel as-is.
import type { DockerEndpoint } from './endpoint'

export type DockerErrorCode = 'unavailable' | 'conflict' | 'invalid_params' | 'action_failed'

export class DockerError extends Error {
  readonly code: DockerErrorCode

  constructor(message: string, code: DockerErrorCode) {
    super(message)
    this.name = 'DockerError'
    this.code = code
  }

  static fromSocket(error: NodeJS.ErrnoException, endpoint: DockerEndpoint): DockerError {
    if (error.code === 'ENOENT' || error.code === 'ECONNREFUSED') {
      return new DockerError(`Docker is not running (no socket at ${endpoint.socketPath}).`, 'unavailable')
    }
    if (error.code === 'EACCES') {
      return new DockerError(
        `No permission to use ${endpoint.socketPath}. Add your user to the docker group.`,
        'unavailable'
      )
    }
    return new DockerError(error.message, 'action_failed')
  }

  static fromResponse(status: number, body: string): DockerError {
    let message = body.trim()
    try {
      const parsed = JSON.parse(body) as { message?: unknown }
      if (typeof parsed.message === 'string') message = parsed.message
    } catch {
      // Not JSON: keep the raw body.
    }
    return new DockerError(message || `Docker answered ${status}.`, status === 409 ? 'conflict' : 'action_failed')
  }
}
