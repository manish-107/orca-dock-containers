// A collapsible sidebar section (CONTAINERS, IMAGES, ...) like VS Code's. A section loads only when
// open; a change while closed just marks it stale, so a closed section makes no Docker calls.
import type { PluginPanelEvents } from 'orca'
import { icon } from './icons'
import { renderTree, type ExpandedState, type TreeNode } from './tree'

export type SectionContext = {
  /** Reload this section now (after an action, in case the event stream is down). */
  reload(): void
}

export type SectionSpec = {
  id: string
  title: string
  defaultOpen: boolean
  emptyText: string
  /** Worker event that means this section's data changed. */
  changedEvent?: keyof PluginPanelEvents
  load(context: SectionContext): Promise<readonly TreeNode[]>
}

export type Section = {
  element: HTMLElement
  reload(): void
  isOpen(): boolean
}

export function mountSection(spec: SectionSpec): Section {
  let open = spec.defaultOpen
  let stale = true
  let loading = false
  let queued = false
  const expanded: ExpandedState = new Map()

  const element = document.createElement('section')
  element.className = 'section'
  element.dataset.section = spec.id

  const header = document.createElement('div')
  header.className = 'section-header'
  const toggleButton = document.createElement('button')
  toggleButton.type = 'button'
  toggleButton.className = 'section-toggle'
  const title = document.createElement('span')
  title.textContent = spec.title.toUpperCase()
  toggleButton.append(icon('chevron', 'twisty'), title)

  const refreshButton = document.createElement('button')
  refreshButton.type = 'button'
  refreshButton.className = 'icon-button section-action'
  refreshButton.title = `Refresh ${spec.title}`
  refreshButton.setAttribute('aria-label', `Refresh ${spec.title}`)
  refreshButton.append(icon('refresh'))
  header.append(toggleButton, refreshButton)

  const body = document.createElement('div')
  body.className = 'section-body'
  element.append(header, body)

  function message(text: string, className = 'section-message'): void {
    const line = document.createElement('div')
    line.className = className
    line.textContent = text
    body.replaceChildren(line)
  }

  async function reload(): Promise<void> {
    if (!open) {
      stale = true
      return
    }
    if (loading) {
      queued = true
      return
    }
    loading = true
    stale = false
    if (!body.querySelector('.tree')) message('Loading…')
    try {
      const nodes = await spec.load(context)
      if (nodes.length === 0) message(spec.emptyText)
      else renderTree(body, nodes, expanded)
    } catch (error) {
      message(error instanceof Error ? error.message : String(error), 'section-message error')
    } finally {
      loading = false
      if (queued) {
        queued = false
        void reload()
      }
    }
  }

  const context: SectionContext = { reload: () => void reload() }

  function setOpen(next: boolean): void {
    open = next
    element.classList.toggle('open', open)
    toggleButton.setAttribute('aria-expanded', String(open))
    if (open && stale) void reload()
  }

  toggleButton.addEventListener('click', () => setOpen(!open))
  refreshButton.addEventListener('click', () => {
    if (!open) setOpen(true)
    else void reload()
  })
  if (spec.changedEvent) orca.plugin.on(spec.changedEvent, () => void reload())

  setOpen(open)
  return { element, reload: () => void reload(), isOpen: () => open }
}
