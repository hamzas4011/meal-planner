import { api, type Ingredient, type Recipe } from '../api'
import { h, notice } from '../dom'

export function recipesView(): HTMLElement {
  const status = notice()
  const list = h('div', { class: 'stack' })
  let recipes: Recipe[] = []
  let ingredients: Ingredient[] = []
  let editingId: number | null = null

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
      ;[recipes, ingredients] = await Promise.all([api.recipes.list(), api.ingredients.list()])
      draw()
    } catch (err) {
      status.error((err as Error).message)
    }
  }

  function draw() {
    list.replaceChildren(...recipes.map(card))
    if (!recipes.length) list.append(h('p', { class: 'empty' }, 'No recipes yet. Create one above.'))
  }

  function header(r: Recipe) {
    if (r.id === editingId) {
      const name = h('input', { value: r.name ?? '', required: true, maxlength: 200, 'aria-label': 'Recipe name', class: 'grow' })
      const servings = h('input', { type: 'number', min: 1, max: 100, value: r.servings, required: true, 'aria-label': 'Servings', class: 'num' })
      return h('form', {
        class: 'inline',
        onSubmit: (e) => {
          e.preventDefault()
          editingId = null
          run(() => api.recipes.update(r.id, { name: name.value, servings: servings.valueAsNumber }))
        },
      },
        name, servings, h('span', { class: 'muted' }, 'servings'),
        h('button', { type: 'submit', class: 'primary' }, 'Save'),
        h('button', { type: 'button', onClick: () => { editingId = null; draw() } }, 'Cancel'),
      )
    }

    return h('div', { class: 'inline' },
      h('h3', { class: 'grow' }, r.name ?? '(unnamed)', h('span', { class: 'muted' }, ` · serves ${r.servings}`)),
      h('button', { type: 'button', onClick: () => { editingId = r.id; draw() } }, 'Edit'),
      h('button', {
        type: 'button',
        class: 'danger',
        onClick: () => {
          if (confirm(`Delete recipe "${r.name}"?`)) run(() => api.recipes.remove(r.id))
        },
      }, 'Delete'),
    )
  }

  function ingredientRows(r: Recipe) {
    return r.ingredients.map((ri) => {
      const qty = h('input', {
        type: 'number', min: 0.01, step: 'any', value: ri.quantity, class: 'num',
        'aria-label': `Quantity of ${ri.ingredientName}`,
        onChange: (e) => {
          const input = e.target as HTMLInputElement
          if (!input.reportValidity()) return
          run(() => api.recipes.updateIngredient(r.id, ri.id, { ingredientId: ri.ingredientId, quantity: input.valueAsNumber }))
        },
      })
      return h('li', {},
        h('span', { class: 'grow' }, ri.ingredientName ?? '(unnamed)'),
        qty,
        h('span', { class: 'muted unit' }, ri.unit ?? ''),
        h('button', {
          type: 'button', class: 'danger', 'aria-label': `Remove ${ri.ingredientName}`,
          onClick: () => run(() => api.recipes.removeIngredient(r.id, ri.id)),
        }, 'Remove'),
      )
    })
  }

  function addIngredientForm(r: Recipe) {
    const used = new Set(r.ingredients.map((ri) => ri.ingredientId))
    const available = ingredients.filter((i) => !used.has(i.id))
    if (!ingredients.length) return h('p', { class: 'muted' }, 'Add ingredients on the Ingredients tab first.')
    if (!available.length) return null

    const select = h('select', { required: true, 'aria-label': 'Ingredient' },
      h('option', { value: '' }, 'Add ingredient…'),
      available.map((i) => h('option', { value: i.id }, i.unit ? `${i.name} (${i.unit})` : i.name ?? '')),
    )
    const qty = h('input', { type: 'number', min: 0.01, step: 'any', required: true, placeholder: 'qty', 'aria-label': 'Quantity', class: 'num' })
    return h('form', {
      class: 'inline',
      onSubmit: (e) => {
        e.preventDefault()
        run(() => api.recipes.addIngredient(r.id, { ingredientId: Number(select.value), quantity: qty.valueAsNumber }))
      },
    }, select, qty, h('button', { type: 'submit' }, 'Add'))
  }

  function card(r: Recipe) {
    return h('article', { class: 'card' },
      header(r),
      r.ingredients.length
        ? h('ul', { class: 'rows' }, ingredientRows(r))
        : h('p', { class: 'muted' }, 'No ingredients yet.'),
      addIngredientForm(r),
    )
  }

  const nameInput = h('input', { placeholder: 'Recipe name', required: true, maxlength: 200, 'aria-label': 'Recipe name', class: 'grow' })
  const servingsInput = h('input', { type: 'number', min: 1, max: 100, value: 2, required: true, 'aria-label': 'Servings', class: 'num' })
  const addForm = h('form', {
    class: 'inline card',
    onSubmit: (e) => {
      e.preventDefault()
      run(async () => {
        await api.recipes.create({ name: nameInput.value, servings: servingsInput.valueAsNumber })
        nameInput.value = ''
      })
    },
  }, nameInput, servingsInput, h('span', { class: 'muted' }, 'servings'), h('button', { type: 'submit', class: 'primary' }, 'Create recipe'))

  load()
  return h('section', {}, h('h2', {}, 'Recipes'), addForm, status.el, list)
}

