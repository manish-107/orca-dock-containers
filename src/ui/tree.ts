// A collapsible tree like VS Code's: chevrons, icon, label, muted description, right-click menu.
// Keyboard: Up/Down move, Right/Left expand/collapse, Enter toggles, Shift+F10 or the Menu key
// opens the row's menu.
import { openMenu, type MenuItem } from './context-menu'
import { icon, type IconName } from './icons'

export type Tone = 'ok' | 'bad' | 'warn'

export type TreeNode = {
  /** Unique across the whole tree. */
  key: string
  label: string
  description?: string
  tooltip?: string
  icon: IconName
  tone?: Tone
  children?: readonly TreeNode[]
  defaultExpanded?: boolean
  menu?: () => MenuItem[]
}

/** Which rows are open; owned by the section so it survives reloads. */
export type ExpandedState = Map<string, boolean>

const INDENT_PX = 12

export function renderTree(host: HTMLElement, nodes: readonly TreeNode[], expanded: ExpandedState): void {
  const focusedKey = (document.activeElement as HTMLElement | null)?.dataset?.key
  const list = document.createElement('div')
  list.className = 'tree'
  list.setAttribute('role', 'tree')

  const isOpen = (node: TreeNode) => expanded.get(node.key) ?? node.defaultExpanded ?? false

  function addRows(items: readonly TreeNode[], depth: number): void {
    for (const node of items) {
      const hasChildren = (node.children?.length ?? 0) > 0
      const open = hasChildren && isOpen(node)
      const row = document.createElement('div')
      row.className = 'row'
      row.tabIndex = -1
      row.dataset.key = node.key
      row.setAttribute('role', 'treeitem')
      if (hasChildren) row.setAttribute('aria-expanded', String(open))
      row.style.paddingLeft = `${4 + depth * INDENT_PX}px`
      row.title = node.tooltip ?? [node.label, node.description].filter(Boolean).join(' - ')

      const twisty = icon('chevron', open ? 'twisty open' : 'twisty')
      if (!hasChildren) twisty.style.visibility = 'hidden'
      const label = document.createElement('span')
      label.className = 'label'
      label.textContent = node.label
      row.append(twisty, icon(node.icon, node.tone ? `icon tone-${node.tone}` : 'icon'), label)
      if (node.description) {
        const description = document.createElement('span')
        description.className = 'description'
        description.textContent = node.description
        row.append(description)
      }

      const toggle = () => {
        if (!hasChildren) return
        expanded.set(node.key, !open)
        renderTree(host, nodes, expanded)
        host.querySelector<HTMLElement>(`[data-key="${CSS.escape(node.key)}"]`)?.focus()
      }
      row.addEventListener('click', () => {
        row.focus()
        toggle()
      })
      row.addEventListener('contextmenu', (event) => {
        event.preventDefault()
        row.focus()
        if (node.menu) openMenu(event.clientX, event.clientY, node.menu(), row)
      })
      row.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          toggle()
        } else if ((event.key === 'ArrowRight' && !open) || (event.key === 'ArrowLeft' && open)) {
          event.preventDefault()
          toggle()
        } else if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
          event.preventDefault()
          const box = row.getBoundingClientRect()
          if (node.menu) openMenu(box.left + 24, box.bottom, node.menu(), row)
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          const rows = Array.from(host.querySelectorAll<HTMLElement>('.row'))
          rows[rows.indexOf(row) + (event.key === 'ArrowDown' ? 1 : -1)]?.focus()
        }
      })
      list.append(row)
      if (open) addRows(node.children ?? [], depth + 1)
    }
  }

  addRows(nodes, 0)
  host.replaceChildren(list)
  if (focusedKey) host.querySelector<HTMLElement>(`[data-key="${CSS.escape(focusedKey)}"]`)?.focus()
  const first = host.querySelector<HTMLElement>('.row')
  if (first && !host.querySelector('.row[tabindex="0"]')) first.tabIndex = 0
}
