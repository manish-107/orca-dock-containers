// Opens a log-following command in an Orca terminal, one tab per container or project. Shared by
// View Logs and Compose Logs.
import type { OrcaWorkerApi } from 'orca/worker'
import { DockerError } from '../docker/errors'

export type LogsTerminal = { terminalId: string; focused: boolean; workspace: string }

type Opened = { terminalId: string; workspaceId: string; workspace: string }

/** key → the tab this plugin opened for it, so a second click brings that tab back. */
const opened = new Map<string, Opened>()

/** The tab title, set from inside the shell so the prompt's own title does not replace it.
 *  Only letters, digits and . _ - : space survive, so the title cannot break out of the quotes. */
export function titleCommand(title: string): string {
  const safe = title.replace(/[^\w.:\- ]/g, '').slice(0, 60)
  return `printf '\\033]0;%s\\007' '${safe}'`
}

export async function openLogsTerminal(
  orca: OrcaWorkerApi,
  key: string,
  title: string,
  command: string
): Promise<LogsTerminal> {
  const previous = opened.get(key)
  if (previous && (await stillOpen(orca, previous))) {
    return { terminalId: previous.terminalId, focused: await focus(orca, previous.terminalId), workspace: previous.workspace }
  }
  opened.delete(key)

  const context = await orca.host.call('workspace.readContext')
  if (!context?.workspaceId) {
    throw new DockerError('Open a workspace in Orca first; logs open in one of its terminals.', 'unavailable')
  }
  const { terminalId } = await orca.host.call('terminal.create', {
    workspaceId: context.workspaceId,
    title,
    command: `${titleCommand(title)}; ${command}`
  })
  const entry = { terminalId, workspaceId: context.workspaceId, workspace: context.displayName }
  opened.set(key, entry)
  return { terminalId, focused: await focus(orca, terminalId), workspace: entry.workspace }
}

async function stillOpen(orca: OrcaWorkerApi, entry: Opened): Promise<boolean> {
  try {
    const { terminals } = await orca.host.call('terminal.list', { workspaceId: entry.workspaceId })
    return terminals.some((terminal) => terminal.id === entry.terminalId)
  } catch {
    return false
  }
}

async function focus(orca: OrcaWorkerApi, terminalId: string): Promise<boolean> {
  try {
    const { focused } = await orca.host.call('terminal.focus', { terminalId })
    return focused
  } catch {
    // Older Orca, or a browser client: the terminal is open in the background.
    return false
  }
}
