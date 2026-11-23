// Finds the Docker Engine's Unix socket. TCP hosts (DOCKER_HOST=tcp://...) are not supported yet.
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export type DockerEndpoint = { socketPath: string }

export function resolveEndpoint(
  env: NodeJS.ProcessEnv = process.env,
  exists: (path: string) => boolean = existsSync,
  home: string = homedir()
): DockerEndpoint {
  const host = env.DOCKER_HOST
  if (host?.startsWith('unix://') && host.length > 'unix://'.length) {
    return { socketPath: host.slice('unix://'.length) }
  }
  const runtimeDir = env.XDG_RUNTIME_DIR ?? (process.getuid ? `/run/user/${process.getuid()}` : null)
  const candidates = [
    '/var/run/docker.sock',
    runtimeDir ? join(runtimeDir, 'docker.sock') : null, // rootless Docker
    join(home, '.docker/run/docker.sock'), // Docker Desktop
    join(home, '.docker/desktop/docker.sock'),
    join(home, '.colima/default/docker.sock'),
    join(home, '.orbstack/run/docker.sock')
  ].filter((path): path is string => path !== null)
  return { socketPath: candidates.find((path) => exists(path)) ?? candidates[0] }
}
