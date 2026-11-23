// A short message at the bottom of the panel, for failed actions.
let timer: ReturnType<typeof setTimeout> | undefined

export function showError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  let element = document.querySelector<HTMLElement>('.notice')
  if (!element) {
    element = document.createElement('div')
    element.className = 'notice'
    element.setAttribute('role', 'alert')
    element.addEventListener('click', () => element?.remove())
    document.body.append(element)
  }
  element.textContent = message
  clearTimeout(timer)
  timer = setTimeout(() => element?.remove(), 8_000)
}

/** Runs a panel action and shows its error instead of losing it. */
export function attempt(action: () => Promise<unknown>): void {
  action().catch(showError)
}
