// Bottom pane for Inspect output. Only one is open; it is plain text, so large JSON stays cheap.
import { icon } from './icons'

let pane: HTMLElement | null = null

export function closeDetails(): void {
  pane?.remove()
  pane = null
}

export function showDetails(title: string, text: string): void {
  closeDetails()
  const element = document.createElement('section')
  element.className = 'details'
  element.setAttribute('aria-label', title)

  const header = document.createElement('div')
  header.className = 'details-header'
  const heading = document.createElement('span')
  heading.className = 'details-title'
  heading.textContent = title
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'icon-button'
  close.title = 'Close'
  close.setAttribute('aria-label', 'Close')
  close.append(icon('close'))
  close.addEventListener('click', closeDetails)
  header.append(heading, close)

  const body = document.createElement('pre')
  body.className = 'details-body'
  body.tabIndex = 0
  body.textContent = text
  body.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDetails()
  })

  element.append(header, body)
  document.body.append(element)
  pane = element
  body.focus()
}
