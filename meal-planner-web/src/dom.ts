// Tiny element builder. Text children are added as text nodes, so names typed
// by the user can never inject HTML (unlike building strings for innerHTML).

type Child = Node | string | number | null | undefined | false
type Props = {
  [key: string]: string | number | boolean | null | undefined | ((e: Event) => void)
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue
    if (typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value) // onClick -> click
    } else if (key === 'value' || key === 'checked' || key === 'selected') {
      ;(el as any)[key] = value
    } else if (key === 'class') {
      el.className = String(value)
    } else {
      el.setAttribute(key, value === true ? '' : String(value))
    }
  }

  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue
    el.append(child instanceof Node ? child : String(child))
  }

  return el
}

// Status line shown above a view's content.
export function notice() {
  const el = h('p', { class: 'notice', role: 'status' })
  return {
    el,
    error(message: string) {
      el.textContent = message
      el.className = 'notice error'
    },
    clear() {
      el.textContent = ''
      el.className = 'notice'
    },
  }
}

export function formatQuantity(q: number) {
  return Number(q.toFixed(2)).toString()
}
