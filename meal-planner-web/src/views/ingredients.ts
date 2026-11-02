import { api, type Ingredient } from '../api'
import { h, notice } from '../dom'

export function ingredientsView(): HTMLElement {
  const status = notice()
  const list = h('ul', { class: 'rows' })
  let editingId: number | null = null
  let ingredients: Ingredient[] = []

  async function run(action: () => Promise<unknown>) {
    try {
      await action()
      status.clear()
      await load()
    } catch (err) {
      status.error((err as Error).message)
    }
  }

  async function load() {
    try {
      ingredients = await api.ingredients.list()
      draw()
    } catch (err) {
      status.error((err as Error).message)
    }
  }

  function draw() {
    list.replaceChildren(
      ...ingredients.map((i) => (i.id === editingId ? editRow(i) : row(i))),
    )
    if (!ingredients.length) list.append(h('li', { class: 'empty' }, 'No ingredients yet. Add one above.'))
  }

  function row(i: Ingredient) {
    return h(
      'li',
      {},
      h('span', { class: 'grow' }, i.name ?? '(unnamed)', i.unit ? h('span', { class: 'muted' }, ` (${i.unit})`) : null),
      h('button', { type: 'button', onClick: () => { editingId = i.id; draw() } }, 'Edit'),
      h('button', {
        type: 'button',
        class: 'danger',
        onClick: () => {
          if (confirm(`Delete "${i.name}"?`)) run(() => api.ingredients.remove(i.id))
        },
      }, 'Delete'),
    )
  }

  function editRow(i: Ingredient) {
    const name = h('input', { value: i.name ?? '', required: true, maxlength: 100, 'aria-label': 'Name' })
    const unit = h('input', { value: i.unit ?? '', maxlength: 20, placeholder: 'unit', 'aria-label': 'Unit', class: 'short' })
    return h(
      'li',
      {},
      h('form', {
        class: 'inline grow',
        onSubmit: (e) => {
          e.preventDefault()
          editingId = null
          run(() => api.ingredients.update(i.id, { name: name.value, unit: unit.value || null }))
        },
      },
        name,
        unit,
        h('button', { type: 'submit', class: 'primary' }, 'Save'),
        h('button', { type: 'button', onClick: () => { editingId = null; draw() } }, 'Cancel'),
      ),
    )
  }

  const nameInput = h('input', { placeholder: 'e.g. Tomato', required: true, maxlength: 100, 'aria-label': 'Ingredient name' })
  const unitInput = h('input', { placeholder: 'unit (g, ml, pcs)', maxlength: 20, 'aria-label': 'Unit', class: 'short' })
  const addForm = h('form', {
    class: 'inline card',
    onSubmit: (e) => {
      e.preventDefault()
      run(async () => {
        await api.ingredients.create({ name: nameInput.value, unit: unitInput.value || null })
        nameInput.value = ''
        unitInput.value = ''
        nameInput.focus()
      })
    },
  }, nameInput, unitInput, h('button', { type: 'submit', class: 'primary' }, 'Add ingredient'))

  load()
  return h('section', {}, h('h2', {}, 'Ingredients'), addForm, status.el, list)
}
