// Small inline SVG icons (16px, currentColor), so the panel loads no icon font or image.
export type IconName = 'chevron' | 'play' | 'stop' | 'pause' | 'group' | 'image' | 'tag' | 'refresh' | 'close'

const PATHS: Record<IconName, string> = {
  chevron: '<path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  play: '<path d="M5 3.5l7 4.5-7 4.5z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>',
  stop: '<rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor"/>',
  pause: '<path d="M5.5 4v8M10.5 4v8" stroke="currentColor" stroke-width="2"/>',
  group:
    '<rect x="2.5" y="5.5" width="8" height="8" rx="1" fill="none" stroke="currentColor"/>' +
    '<path d="M5.5 5.5v-3h8v8h-3" fill="none" stroke="currentColor"/>',
  image:
    '<rect x="2.5" y="2.5" width="11" height="11" rx="1.5" fill="none" stroke="currentColor"/>' +
    '<path d="M2.5 6.5h11M5 4.5h1" stroke="currentColor"/>',
  tag: '<path d="M4.5 2.5h7v11l-3.5-3-3.5 3z" fill="none" stroke="currentColor" stroke-linejoin="round"/>',
  refresh:
    '<path d="M13 8a5 5 0 1 1-1.5-3.6" fill="none" stroke="currentColor" stroke-width="1.3"/>' +
    '<path d="M13 2.5v3h-3" fill="none" stroke="currentColor" stroke-width="1.3"/>',
  close: '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.3"/>'
}

export function icon(name: IconName, className = 'icon'): SVGSVGElement {
  const wrapper = document.createElement('span')
  wrapper.innerHTML = `<svg class="${className}" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">${PATHS[name]}</svg>`
  return wrapper.firstElementChild as SVGSVGElement
}
