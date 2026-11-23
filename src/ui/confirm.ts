// "Remove…?" dialog drawn inside the panel (the panel frame has no window.confirm).
export function confirmDialog(message: string, confirmLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div')
    backdrop.className = 'dialog-backdrop'
    const dialog = document.createElement('div')
    dialog.className = 'dialog'
    dialog.setAttribute('role', 'alertdialog')
    dialog.setAttribute('aria-modal', 'true')

    const text = document.createElement('p')
    text.textContent = message
    const actions = document.createElement('div')
    actions.className = 'dialog-actions'
    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.className = 'button'
    cancel.textContent = 'Cancel'
    const ok = document.createElement('button')
    ok.type = 'button'
    ok.className = 'button danger'
    ok.textContent = confirmLabel
    actions.append(cancel, ok)
    dialog.append(text, actions)
    backdrop.append(dialog)

    const previous = document.activeElement as HTMLElement | null
    const done = (answer: boolean) => {
      backdrop.remove()
      previous?.focus()
      resolve(answer)
    }
    cancel.addEventListener('click', () => done(false))
    ok.addEventListener('click', () => done(true))
    backdrop.addEventListener('mousedown', (event) => {
      if (event.target === backdrop) done(false)
    })
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') done(false)
    })

    document.body.append(backdrop)
    cancel.focus()
  })
}
