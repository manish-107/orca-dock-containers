// Minimal Docker Engine API client over the Unix socket. Node built-ins only: no `docker` process
// per call and no npm dependency.
import { request, type IncomingMessage } from 'node:http'
import type { DockerEndpoint } from './endpoint'
import { DockerError } from './errors'

const MAX_BODY_BYTES = 8 * 1024 * 1024

export type DockerClient = {
  readonly endpoint: DockerEndpoint
  /** GET and parse JSON. */
  get<T>(path: string, signal?: AbortSignal): Promise<T>
  /** GET the raw body. */
  text(path: string, signal?: AbortSignal): Promise<string>
  post(path: string, signal?: AbortSignal): Promise<void>
  delete(path: string, signal?: AbortSignal): Promise<void>
  /** Follows a streaming endpoint line by line until it ends or `signal` aborts. */
  stream(path: string, onLine: (line: string) => void, signal: AbortSignal): Promise<void>
}

export function createDockerClient(endpoint: DockerEndpoint): DockerClient {
  function open(method: string, path: string, signal?: AbortSignal): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {
      const req = request(
        { socketPath: endpoint.socketPath, path, method, signal, headers: { Host: 'docker' } },
        resolve
      )
      req.on('error', (error: NodeJS.ErrnoException) => {
        reject(error.name === 'AbortError' ? error : DockerError.fromSocket(error, endpoint))
      })
      req.end()
    })
  }

  async function call(method: string, path: string, signal?: AbortSignal): Promise<string> {
    const res = await open(method, path, signal)
    const body = await readBody(res)
    const status = res.statusCode ?? 500
    if (status >= 400) throw DockerError.fromResponse(status, body)
    return body
  }

  return {
    endpoint,
    async get<T>(path: string, signal?: AbortSignal): Promise<T> {
      return JSON.parse(await call('GET', path, signal)) as T
    },
    text: (path, signal) => call('GET', path, signal),
    async post(path, signal) {
      await call('POST', path, signal) // 304 (already started/stopped) counts as success
    },
    async delete(path, signal) {
      await call('DELETE', path, signal)
    },
    async stream(path, onLine, signal) {
      const res = await open('GET', path, signal)
      const status = res.statusCode ?? 500
      if (status >= 400) throw DockerError.fromResponse(status, await readBody(res))
      res.setEncoding('utf8')
      let buffer = ''
      await new Promise<void>((resolve, reject) => {
        res.on('data', (chunk: string) => {
          buffer += chunk
          let newline = buffer.indexOf('\n')
          while (newline !== -1) {
            const line = buffer.slice(0, newline).trim()
            buffer = buffer.slice(newline + 1)
            if (line) onLine(line)
            newline = buffer.indexOf('\n')
          }
        })
        res.on('end', resolve)
        res.on('close', resolve)
        res.on('error', reject)
      })
    }
  }
}

function readBody(res: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    res.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        res.destroy()
        reject(new DockerError('Docker answered with more data than this panel reads.', 'action_failed'))
        return
      }
      chunks.push(chunk)
    })
    res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    res.on('error', reject)
  })
}
