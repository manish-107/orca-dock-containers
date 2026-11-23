// The right-click menu. One menu open at a time; closes on Escape, a click elsewhere, or scroll.
export type MenuItem = { label: string; run: () => void; danger?: boolean } | 'separator'

let current: { element: HTMLElement; close: () => void } | null = null

export function closeMenu(): void {
  current?.close()
}

export function openMenu(x: number, y: number, items: readonly MenuItem[], returnFocus?: HTMLElement): void {
  closeMenu()
  if (items.length === 0) return
  const menu = document.createElement('div')
  menu.className = 'menu'
  menu.setAttribute('role', 'menu')

  const buttons: HTMLButtonElement[] = []
  for (const item of items) {
    if (item === 'separator') {
      const line = document.createElement('div')
      line.className = 'menu-separator'
      line.setAttribute('role', 'separator')
      menu.append(line)
      continue
    }
    const button = document.createElement('button')
    button.type = 'button'
    button.className = item.danger ? 'menu-item danger' : 'menu-item'
    button.setAttribute('role', 'menuitem')
    button.textContent = item.label
    button.addEventListener('click', () => {
      close()
      item.run()
    })
    buttons.push(button)
    menu.append(button)
  }

  function onKey(event: KeyboardEvent): void {
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      buttons[(index + step + buttons.length) % buttons.length]?.focus()
    }
  }
  function onPointer(event: MouseEvent): void {
    if (!menu.contains(event.target as Node)) close()
  }
  function close(): void {
    if (current?.element !== menu) return
    current = null
    menu.remove()
    document.removeEventListener('keydown', onKey, true)
    document.removeEventListener('mousedown', onPointer, true)
    window.removeEventListener('blur', close)
    window.removeEventListener('resize', close)
    document.removeEventListener('scroll', close, true)
    returnFocus?.focus()
  }

  document.body.append(menu)
  // Keep the menu inside the panel: flip left/up when it would overflow.
  const { width, height } = menu.getBoundingClientRect()
  menu.style.left = `${Math.max(4, Math.min(x, window.innerWidth - width - 4))}px`
  menu.style.top = `${Math.max(4, y + height > window.innerHeight - 4 ? y - height : y)}px`

  current = { element: menu, close }
  document.addEventListener('keydown', onKey, true)
  document.addEventListener('mousedown', onPointer, true)
  window.addEventListener('blur', close)
  window.addEventListener('resize', close)
  document.addEventListener('scroll', close, true)
  buttons[0]?.focus()
}
