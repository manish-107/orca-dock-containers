// A short message at the bottom of the panel, for failed actions.
let timer: ReturnType<typeof setTimeout> | undefined

export function showError(error: unknown): void {
  show(error instanceof Error ? error.message : String(error), 'error', 8_000)
}

/** A progress line such as "Starting local-dev…"; returns a function that hides it. With
 *  `hideAfterMs` it also hides itself. */
export function showInfo(message: string, hideAfterMs = 0): () => void {
  const element = show(message, 'info', hideAfterMs)
  return () => {
    if (element.isConnected && element.textContent === message) element.remove()
  }
}

function show(message: string, kind: 'error' | 'info', hideAfterMs: number): HTMLElement {
  let element = document.querySelector<HTMLElement>('.notice')
  if (!element) {
    element = document.createElement('div')
    element.addEventListener('click', () => element?.remove())
    document.body.append(element)
  }
  element.className = `notice ${kind}`
  element.setAttribute('role', kind === 'error' ? 'alert' : 'status')
  element.textContent = message
  clearTimeout(timer)
  const shown = element
  if (hideAfterMs > 0) timer = setTimeout(() => shown.remove(), hideAfterMs)
  return shown
}

/** Runs a panel action and shows its error instead of losing it. */
export function attempt(action: () => Promise<unknown>): void {
  action().catch(showError)
}
