// Compose project actions, worker side. The Engine API has no "compose", so these run the
// `docker compose` CLI once per click (no shell; arguments are passed as a list).
import { execFile } from 'node:child_process'
import { DockerError } from '../../docker/errors'
import type { WorkerContext } from '../context'
import { openLogsTerminal } from '../logs-terminal'
import { composeArgs, isProjectName } from './model'
import type { ComposeAction } from './types'

const ACTIONS: readonly ComposeAction[] = ['start', 'stop', 'restart', 'down']
/** Under the panel's 120 s request limit. */
const TIMEOUT_MS = 110_000

function checkProject(project: unknown): string {
  if (!isProjectName(project)) throw new DockerError('Not a Compose project name.', 'invalid_params')
  return project
}

function runDocker(args: string[], signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('docker', args, { cwd: '/', timeout: TIMEOUT_MS, signal, maxBuffer: 1024 * 1024 }, (error, _stdout, stderr) => {
      if (!error) return resolve()
      const code = (error as NodeJS.ErrnoException).code
      if (code === 'ENOENT') return reject(new DockerError('The docker command was not found on PATH.', 'unavailable'))
      const lines = String(stderr).trim().split('\n').filter(Boolean)
      reject(new DockerError(lines.at(-1) ?? error.message, 'action_failed'))
    })
  })
}

export function registerCompose({ orca }: WorkerContext): void {
  orca.panels.handle('compose.action', async ({ project, action }, { signal }) => {
    if (!ACTIONS.includes(action)) throw new DockerError(`Unknown action ${String(action)}.`, 'invalid_params')
    await runDocker(composeArgs(checkProject(project), action), signal)
    return { ok: true as const }
  })

  orca.panels.handle('compose.logs', async ({ project }) => {
    const name = checkProject(project)
    return openLogsTerminal(
      orca,
      `compose:${name}`,
      `logs: ${name}`,
      ['docker', ...composeArgs(name, 'logs', '-f', '--tail', '200')].join(' ')
    )
  })
}
