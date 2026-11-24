// Containers, panel side: the CONTAINERS section and its right-click menu.
import type { MenuItem } from '../../ui/context-menu'
import { confirmDialog } from '../../ui/confirm'
import { showDetails } from '../../ui/details'
import { attempt, showInfo } from '../../ui/notice'
import type { SectionContext, SectionSpec } from '../../ui/section'
import type { LogsTerminal } from '../logs-terminal'
import type { TreeNode } from '../../ui/tree'
import { actionsFor, groupByProject, toneOf } from './model'
import type { ComposeAction, ContainerAction, ContainerSummary } from './types'

const ACTION_LABELS: Record<ContainerAction, string> = { start: 'Start', stop: 'Stop', restart: 'Restart' }

export function containersSection(): SectionSpec {
  return {
    id: 'containers',
    title: 'Containers',
    defaultOpen: true,
    emptyText: 'No containers.',
    changedEvent: 'containers.changed',
    async load(context) {
      const { containers } = await orca.plugin.request('containers.list')
      return groupByProject(containers).map((group) => ({
        key: group.key,
        label: group.label,
        icon: 'group' as const,
        defaultExpanded: true,
        menu: group.project === null ? undefined : () => composeMenu(group.project as string, context),
        children: group.containers.map((container) => containerNode(container, context))
      }))
    }
  }
}

const COMPOSE_PROGRESS: Record<ComposeAction, string> = {
  start: 'Starting',
  stop: 'Stopping',
  restart: 'Restarting',
  down: 'Taking down'
}

/** Right-click on a Compose project, as in VS Code: Logs | Start, Stop | Restart, Down. */
function composeMenu(project: string, context: SectionContext): MenuItem[] {
  const run = (action: ComposeAction) =>
    attempt(async () => {
      if (
        action === 'down' &&
        !(await confirmDialog(
          `Run "compose down" on "${project}"? Its containers and networks are removed; volumes are kept.`,
          'Compose Down'
        ))
      ) {
        return
      }
      const hide = showInfo(`${COMPOSE_PROGRESS[action]} ${project}…`)
      try {
        await orca.plugin.request('compose.action', { project, action }, { timeoutMs: 120_000 })
      } finally {
        hide()
        context.reload()
      }
    })
  return [
    { label: 'Compose Logs', run: () => attempt(async () => whereLogsOpened(await orca.plugin.request('compose.logs', { project }))) },
    'separator',
    { label: 'Compose Start', run: () => run('start') },
    { label: 'Compose Stop', run: () => run('stop') },
    'separator',
    { label: 'Compose Restart', run: () => run('restart') },
    { label: 'Compose Down…', danger: true, run: () => run('down') }
  ]
}

/** Orca could not bring the logs tab forward, so say where it is. */
function whereLogsOpened({ focused, workspace }: LogsTerminal): void {
  if (!focused) showInfo(`Logs are open in a terminal tab of "${workspace}".`, 5_000)
}

function containerNode(container: ContainerSummary, context: SectionContext): TreeNode {
  return {
    key: `container:${container.id}`,
    label: container.image,
    description: `${container.name} - ${container.status}`,
    icon: container.state === 'running' ? 'play' : container.state === 'paused' ? 'pause' : 'stop',
    tone: toneOf(container),
    menu: () => containerMenu(container, context)
  }
}

function containerMenu(container: ContainerSummary, context: SectionContext): MenuItem[] {
  const { id, name } = container
  const running = container.state !== 'exited' && container.state !== 'created' && container.state !== 'dead'
  return [
    {
      label: 'View Logs',
      run: () => attempt(async () => whereLogsOpened(await orca.plugin.request('containers.logs', { id, name })))
    },
    {
      label: 'Inspect',
      run: () =>
        attempt(async () => {
          const { json } = await orca.plugin.request('containers.inspect', { id })
          showDetails(`Inspect: ${name}`, json)
        })
    },
    'separator',
    ...actionsFor(container).map((action) => ({
      label: ACTION_LABELS[action],
      run: () =>
        attempt(async () => {
          await orca.plugin.request('containers.action', { id, action })
          context.reload()
        })
    })),
    'separator',
    {
      label: 'Remove…',
      danger: true,
      run: () =>
        attempt(async () => {
          const warning = running ? ' It is running and will be stopped first.' : ''
          if (!(await confirmDialog(`Remove container "${name}"?${warning}`, 'Remove'))) return
          await orca.plugin.request('containers.remove', { id, force: running })
          context.reload()
        })
    }
  ]
}
