import { api, type ShoppingListItem } from '../api'
import { addDays, selectedWeek, toIso } from '../dates'
import { formatQuantity, h, notice } from '../dom'

export function shoppingView(): HTMLElement {
  const status = notice()
  const list = h('ul', { class: 'rows checklist' })
  const from = h('input', { type: 'date', required: true, value: toIso(selectedWeek.start), 'aria-label': 'From' })
  const to = h('input', { type: 'date', required: true, value: toIso(addDays(selectedWeek.start, 6)), 'aria-label': 'To' })

  async function load() {
    if (!from.value || !to.value) return
    try {
      const items = await api.shoppingList.get(from.value, to.value)
      status.clear()
      draw(items)
    } catch (err) {
      list.replaceChildren()
      status.error((err as Error).message)
    }
  }

  function draw(items: ShoppingListItem[]) {
    list.replaceChildren(...items.map((item) =>
      h('li', {},
        h('label', { class: 'grow' },
          h('input', { type: 'checkbox' }),
          h('span', {}, item.name ?? '(unnamed)'),
        ),
        h('span', { class: 'qty' }, formatQuantity(item.quantity), item.unit ? ` ${item.unit}` : ''),
      ),
    ))
    if (!items.length) list.append(h('li', { class: 'empty' }, 'Nothing to buy: no meals with ingredients are planned in this range.'))
  }

  const form = h('form', {
    class: 'inline card',
    onSubmit: (e) => { e.preventDefault(); load() },
  },
    h('label', {}, 'From ', from),
    h('label', {}, 'To ', to),
    h('button', { type: 'submit', class: 'primary' }, 'Show list'),
    h('button', { type: 'button', onClick: () => window.print() }, 'Print'),
  )

  load()
  return h('section', {}, h('h2', {}, 'Shopping list'), form, status.el, list)
}
