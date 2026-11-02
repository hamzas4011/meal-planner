import { api, type PlannedMeal, type Recipe } from '../api'
import { addDays, formatDay, selectedWeek, startOfWeek, toIso } from '../dates'
import { h, notice } from '../dom'

export function planView(): HTMLElement {
  const status = notice()
  const title = h('span', { class: 'week-title' })
  const grid = h('div', { class: 'week' })
  let recipes: Recipe[] = []
  let meals: PlannedMeal[] = []

  const days = () => Array.from({ length: 7 }, (_, i) => addDays(selectedWeek.start, i))

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
    const week = days()
    title.textContent = `${formatDay(week[0])} – ${formatDay(week[6])}`
    try {
      ;[recipes, meals] = await Promise.all([
        api.recipes.list(),
        api.plannedMeals.list(toIso(week[0]), toIso(week[6])),
      ])
      draw()
    } catch (err) {
      status.error((err as Error).message)
    }
  }

  function goToWeek(start: Date) {
    selectedWeek.start = start
    status.clear()
    load()
  }

  function mealRow(m: PlannedMeal) {
    const servings = h('input', {
      type: 'number', min: 1, max: 100, value: m.servings, class: 'num',
      'aria-label': `Servings of ${m.recipeName}`, title: 'Servings',
      onChange: (e) => {
        const input = e.target as HTMLInputElement
        if (!input.reportValidity()) return
        run(() => api.plannedMeals.update(m.id, { recipeId: m.recipeId, date: m.date, servings: input.valueAsNumber }))
      },
    })
    return h('li', {},
      h('span', { class: 'grow' }, m.recipeName ?? '(unnamed)'),
      servings,
      h('button', {
        type: 'button', class: 'icon danger', 'aria-label': `Remove ${m.recipeName}`, title: 'Remove',
        onClick: () => run(() => api.plannedMeals.remove(m.id)),
      }, '×'),
    )
  }

  function addForm(date: string) {
    const servings = h('input', { type: 'number', min: 1, max: 100, value: 2, required: true, class: 'num', 'aria-label': 'Servings', title: 'Servings' })
    const select = h('select', {
      required: true, 'aria-label': 'Recipe', class: 'grow',
      onChange: () => {
        // Default to the recipe's own serving count.
        const recipe = recipes.find((r) => r.id === Number(select.value))
        if (recipe) servings.value = String(recipe.servings)
      },
    },
      h('option', { value: '' }, 'Add meal…'),
      recipes.map((r) => h('option', { value: r.id }, r.name ?? '(unnamed)')),
    )
    return h('form', {
      class: 'inline',
      onSubmit: (e) => {
        e.preventDefault()
        run(() => api.plannedMeals.create({ recipeId: Number(select.value), date, servings: servings.valueAsNumber }))
      },
    }, select, servings, h('button', { type: 'submit', class: 'icon', 'aria-label': 'Add meal', title: 'Add' }, '+'))
  }

  function draw() {
    const today = toIso(new Date())
    grid.replaceChildren(...days().map((d) => {
      const iso = toIso(d)
      const dayMeals = meals.filter((m) => m.date === iso)
      return h('div', { class: iso === today ? 'day card today' : 'day card' },
        h('h3', {}, formatDay(d)),
        dayMeals.length ? h('ul', { class: 'rows' }, dayMeals.map(mealRow)) : h('p', { class: 'muted' }, 'Nothing planned'),
        recipes.length ? addForm(iso) : null,
      )
    }))
    if (!recipes.length) status.error('Create a recipe on the Recipes tab before planning meals.')
  }

  const nav = h('div', { class: 'inline week-nav' },
    h('button', { type: 'button', onClick: () => goToWeek(addDays(selectedWeek.start, -7)) }, '← Previous'),
    h('button', { type: 'button', onClick: () => goToWeek(startOfWeek(new Date())) }, 'This week'),
    h('button', { type: 'button', onClick: () => goToWeek(addDays(selectedWeek.start, 7)) }, 'Next →'),
    title,
  )

  load()
  return h('section', {}, h('h2', {}, 'Week plan'), nav, status.el, grid)
}
