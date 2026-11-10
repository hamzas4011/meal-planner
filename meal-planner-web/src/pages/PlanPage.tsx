import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { api, type PlannedMeal, type Recipe } from '../api'
import { addExampleData } from '../exampleData'
import {
  BookIcon, CalendarIcon, CartIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, SparklesIcon, XIcon,
} from '../components/icons'
import {
  Button, Card, CommitNumberInput, ErrorNotice, inputClass, linkClass, Loading, PageTitle,
} from '../components/ui'
import { addDays, formatDay, formatDayMonth, formatWeekday, fromIso, startOfWeek, toIso } from '../dates'
import { useApiData } from '../useApiData'

type Run = (action: () => Promise<unknown>, success?: string) => Promise<boolean>

export default function PlanPage() {
  // The week lives in the URL (/plan?week=2026-11-02) so it survives a refresh and can be linked.
  const [params, setParams] = useSearchParams()
  const weekStart = startOfWeek(fromIso(params.get('week')) ?? new Date())
  const from = toIso(weekStart)
  const to = toIso(addDays(weekStart, 6))
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const { data, error, loading, run, dismissError } = useApiData(
    async () => {
      const [recipes, meals] = await Promise.all([api.recipes.list(), api.plannedMeals.list(from, to)])
      return { recipes, meals }
    },
    [from, to],
  )

  // The last removed meal, offered back through the Undo bar until the user does something else.
  const [removed, setRemoved] = useState<{ meal: PlannedMeal; dayLabel: string } | null>(null)

  const runAndForgetUndo: Run = (action, success) => {
    setRemoved(null)
    return run(action, success)
  }

  async function removeMeal(meal: PlannedMeal, dayLabel: string) {
    const ok = await run(() => api.plannedMeals.remove(meal.id), `${meal.recipeName} removed from ${dayLabel}. Undo is available.`)
    if (ok) setRemoved({ meal, dayLabel })
  }

  // The Undo bar is about to disappear with focus inside it; keep keyboard users on the page.
  function closeUndoBar() {
    setRemoved(null)
    document.getElementById('main')?.focus({ preventScroll: true })
  }

  function undoRemove() {
    if (!removed) return
    const { meal, dayLabel } = removed
    closeUndoBar()
    run(() => api.plannedMeals.create({ recipeId: meal.recipeId, date: meal.date, servings: meal.servings }),
      `${meal.recipeName} put back on ${dayLabel}`)
  }

  // The example card disappears once the week is filled, with focus inside it. Move focus to the
  // filled week, so keyboard and screen-reader users land on what was just planned.
  const weekList = useRef<HTMLUListElement>(null)
  async function fillWithExamples() {
    const ok = await runAndForgetUndo(() => addExampleData(weekStart), 'Example week planned: a dinner for every day')
    if (ok) setTimeout(() => weekList.current?.focus())
    return ok
  }

  const goToWeek = (start: Date) => setParams({ week: toIso(start) })
  const today = toIso(new Date())
  const isThisWeek = from === toIso(startOfWeek(new Date()))
  const weekLabel = `${formatDayMonth(days[0])} – ${formatDayMonth(days[6])}`

  return (
    <section>
      <PageTitle description="Plan your meals for the week. The shopping list adds up everything you need."
        actions={
          <Link to={`/shopping?from=${from}&to=${to}`}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 py-2 font-medium sm:w-auto text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400`}>
            <CartIcon className="size-4" /> Shopping list for {isThisWeek ? 'this week' : weekLabel}
          </Link>
        }>
        Week plan
      </PageTitle>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button onClick={() => goToWeek(addDays(weekStart, -7))} aria-label="Previous week" title="Previous week" className="min-h-11 min-w-11 px-2">
            <ChevronLeftIcon />
          </Button>
          <Button onClick={() => goToWeek(addDays(weekStart, 7))} aria-label="Next week" title="Next week" className="min-h-11 min-w-11 px-2">
            <ChevronRightIcon />
          </Button>
        </div>
        {/* Announced when the week changes, so screen-reader users know where they are. */}
        <p className="text-lg font-semibold text-stone-900 dark:text-stone-100" aria-live="polite">
          {weekLabel}
        </p>
        {!isThisWeek && <Button variant="ghost" onClick={() => setParams({})}>Back to this week</Button>}
      </div>

      <ErrorNotice message={error} onDismiss={dismissError} />
      {loading && <Loading />}

      {data && data.recipes.length === 0 && <Welcome onExample={fillWithExamples} />}

      {/* Any later empty week can be filled in one click too, so a visitor always sees the full flow. */}
      {data && data.recipes.length > 0 && data.meals.length === 0 && <EmptyWeekBar onExample={fillWithExamples} />}

      {data && (
        // Every row as tall as the tallest one, so the grid looks even. Not on phones (one column),
        // where empty days would just become tall blank boxes.
        <ul ref={weekList} tabIndex={-1} className="grid grid-cols-1 gap-3 outline-none sm:auto-rows-fr sm:grid-cols-2 lg:grid-cols-4"
          aria-label={`Week, ${weekLabel}`}>
          {days.map((day) => {
            const iso = toIso(day)
            return (
              <li key={iso} className="flex">
                <DayCard date={iso} weekday={formatWeekday(day)} dayMonth={formatDayMonth(day)} label={formatDay(day)}
                  isToday={iso === today} meals={data.meals.filter((m) => m.date === iso)} recipes={data.recipes}
                  run={runAndForgetUndo} onRemove={removeMeal} />
              </li>
            )
          })}
          {/* 7 days leave one empty spot in the 2- and 4-column grids; a summary fills it. */}
          <li className="flex">
            <WeekSummary meals={data.meals} shoppingLink={`/shopping?from=${from}&to=${to}`} />
          </li>
        </ul>
      )}

      {removed && (
        // Sits above the phone tab bar, including the space iPhones reserve at the bottom.
        <div className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center gap-1 rounded-lg bg-stone-900 py-1 pr-1 pl-4 text-white shadow-lg sm:bottom-6 print:hidden dark:bg-stone-100 dark:text-stone-900">
          <p className="min-w-0 flex-1 text-sm">{removed.meal.recipeName} removed from {removed.dayLabel}</p>
          <Button key={removed.meal.id} autoFocus variant="ghost" onClick={undoRemove}
            className="min-h-11 font-semibold text-emerald-300! hover:bg-white/10! dark:text-emerald-800! dark:hover:bg-stone-900/10!">
            Undo
          </Button>
          <Button variant="ghost" aria-label="Dismiss" onClick={closeUndoBar}
            className="min-h-11 min-w-11 text-stone-300! hover:bg-white/10! dark:text-stone-600! dark:hover:bg-stone-900/10!">
            <XIcon className="size-4" />
          </Button>
        </div>
      )}
    </section>
  )
}

// The same big, clearly worded button everywhere examples are offered.
function ExampleButton({ onExample }: { onExample: () => Promise<boolean> }) {
  const [busy, setBusy] = useState(false)
  return (
    <Button variant="primary" className="w-full sm:w-auto" disabled={busy} aria-busy={busy}
      onClick={async () => { setBusy(true); await onExample(); setBusy(false) }}>
      <SparklesIcon className="size-4" /> {busy ? 'Adding examples…' : 'Try an example week'}
    </Button>
  )
}

// First-visit guide, shown until the first recipe exists: the example comes first, then the steps.
function Welcome({ onExample }: { onExample: () => Promise<boolean> }) {
  const steps = [
    { icon: CalendarIcon, title: 'Plan your week', text: 'Press "Add meal" on a day and type what you’ll eat.', to: null },
    { icon: BookIcon, title: 'Add ingredients', text: 'Say what goes into each recipe.', to: '/recipes' },
    { icon: CartIcon, title: 'Go shopping', text: 'Get one list with everything added up.', to: '/shopping' },
  ]

  return (
    <Card className="mb-4 border-emerald-200 bg-linear-to-br from-emerald-50 to-white dark:border-emerald-900 dark:from-emerald-950/60 dark:to-stone-900">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Welcome to Meal Planner</h3>
          <p className="text-stone-600 dark:text-stone-400">See how it works with one click.</p>
        </div>
        <ExampleButton onExample={onExample} />
      </div>

      <p className="mt-4 border-t border-emerald-200/70 pt-3 text-sm text-stone-600 dark:border-emerald-900 dark:text-stone-400">
        Or start yourself:
      </p>
      <ol className="mt-3 grid gap-3 sm:grid-cols-3">
        {steps.map(({ icon: Icon, title, text, to }, i) => (
          <li key={title} className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-700 text-white dark:bg-emerald-500 dark:text-emerald-950">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="font-semibold text-stone-900 dark:text-stone-100">
                <span className="sr-only">Step {i + 1}: </span>
                {to ? <Link to={to} className={linkClass}>{title}</Link> : title}
              </p>
              <p className="text-sm text-stone-600 dark:text-stone-400">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}

// Shown on any empty week once recipes exist.
function EmptyWeekBar({ onExample }: { onExample: () => Promise<boolean> }) {
  return (
    <section aria-labelledby="example-week-title"
      className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-white p-4 shadow-sm dark:border-emerald-900 dark:from-emerald-950/60 dark:to-stone-900">
      <div className="min-w-0 flex-1">
        <h3 id="example-week-title" className="font-semibold text-stone-900 dark:text-stone-100">Nothing planned this week</h3>
        <p className="text-sm text-stone-600 dark:text-stone-400">See how it works with one click.</p>
      </div>
      <ExampleButton onExample={onExample} />
    </section>
  )
}

function WeekSummary({ meals, shoppingLink }: { meals: PlannedMeal[]; shoppingLink: string }) {
  const plannedDays = new Set(meals.map((m) => m.date)).size
  const servings = meals.reduce((sum, m) => sum + m.servings, 0)
  const stats = [
    { value: meals.length, label: meals.length === 1 ? 'meal planned' : 'meals planned' },
    { value: `${plannedDays}/7`, label: 'days covered' },
    { value: servings, label: servings === 1 ? 'serving' : 'servings' },
  ]

  return (
    <Card className="flex w-full flex-col gap-3 border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/40">
      <h3 className="font-semibold text-stone-900 dark:text-stone-100">This week</h3>
      <dl className="grid gap-1.5">
        {stats.map(({ value, label }) => (
          <div key={label} className="flex items-baseline gap-2">
            <dt className="sr-only">{label}</dt>
            <dd className="text-lg font-semibold text-emerald-800 tabular-nums dark:text-emerald-300">{value}</dd>
            <span className="text-sm text-stone-600 dark:text-stone-400" aria-hidden="true">{label}</span>
          </div>
        ))}
      </dl>
      <Link to={shoppingLink} className={`mt-auto inline-flex items-center gap-2 text-sm font-medium ${linkClass}`}>
        <CartIcon className="size-4" /> {meals.length > 0 ? 'See what to buy' : 'Plan a meal to get a list'}
      </Link>
    </Card>
  )
}

function DayCard({ date, weekday, dayMonth, label, isToday, meals, recipes, run, onRemove }: {
  date: string
  weekday: string
  dayMonth: string
  label: string
  isToday: boolean
  meals: PlannedMeal[]
  recipes: Recipe[]
  run: Run
  onRemove: (meal: PlannedMeal, dayLabel: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const addButton = useRef<HTMLButtonElement>(null)

  function stopAdding() {
    setAdding(false)
    // Put focus back on the button that opened the form, so keyboard users don't get lost.
    setTimeout(() => addButton.current?.focus())
  }

  return (
    <Card className={`flex w-full flex-col gap-2 ${isToday ? 'border-emerald-600 ring-1 ring-emerald-600 dark:border-emerald-500 dark:ring-emerald-500' : ''}`}>
      <h3 className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-stone-900 dark:text-stone-100">
          {weekday} <span className="font-normal text-stone-500 dark:text-stone-400">{dayMonth}</span>
        </span>
        {/* Text, not just the green border: colour alone isn't enough to show "today". */}
        {isToday && (
          <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-medium text-white dark:bg-emerald-500 dark:text-emerald-950">
            Today
          </span>
        )}
      </h3>

      {meals.length === 0 && !adding && (
        <p className="text-sm text-stone-500 dark:text-stone-400">Nothing planned yet</p>
      )}

      {meals.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {meals.map((m) => (
            <li key={m.id} className="rounded-lg bg-stone-50 py-1.5 pr-1 pl-2.5 dark:bg-stone-800/60">
              <p className="font-medium break-words text-stone-900 dark:text-stone-100">{m.recipeName ?? '(unnamed)'}</p>
              {/* A recipe created from here has no ingredients yet, so it can't reach the shopping list. */}
              {recipes.find((r) => r.id === m.recipeId)?.ingredients.length === 0 && (
                <Link to={`/recipes?edit=${m.recipeId}`} className={`text-sm ${linkClass}`}>
                  No ingredients yet – add them
                </Link>
              )}
              <div className="mt-1 flex items-center gap-2">
                <CommitNumberInput label={`Servings of ${m.recipeName} on ${label}`} value={m.servings} min={1} max={100}
                  className="w-14 py-1"
                  onCommit={(servings) =>
                    run(() => api.plannedMeals.update(m.id, { recipeId: m.recipeId, date: m.date, servings }),
                      `${m.recipeName} on ${label}: ${servings} servings`)} />
                <span className="flex-1 text-sm text-stone-600 dark:text-stone-400" aria-hidden="true">
                  {m.servings === 1 ? 'serving' : 'servings'}
                </span>
                <Button variant="ghost" className="min-h-11 min-w-11 px-1.5 text-stone-500 hover:text-red-700 dark:text-stone-400 dark:hover:text-red-400"
                  aria-label={`Remove ${m.recipeName} from ${label}`} title="Remove"
                  onClick={() => onRemove(m, label)}>
                  <XIcon className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto">
        {adding ? (
          <AddMealForm date={date} dayLabel={label} recipes={recipes} run={run} onDone={stopAdding} />
        ) : (
          <Button ref={addButton} variant="ghost" className="w-full justify-start border-dashed border-stone-300! dark:border-stone-700!"
            aria-label={`Add meal on ${label}`} onClick={() => setAdding(true)}>
            <PlusIcon className="size-4" /> Add meal
          </Button>
        )}
      </div>
    </Card>
  )
}

function AddMealForm({ date, dayLabel, recipes, run, onDone }: {
  date: string
  dayLabel: string
  recipes: Recipe[]
  run: Run
  onDone: () => void
}) {
  const [recipeId, setRecipeId] = useState('')
  const [newName, setNewName] = useState('')
  const [servings, setServings] = useState(2)
  // With no recipes yet, typing a new one is the only option.
  const creating = recipeId === NEW_RECIPE || recipes.length === 0

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const name = creating ? newName.trim() : recipes.find((r) => r.id === Number(recipeId))?.name
    // A new recipe is created and planned in one go; its ingredients can be added later.
    if (await run(async () => {
      const id = creating ? (await api.recipes.create({ name: newName.trim(), servings })).id : Number(recipeId)
      await api.plannedMeals.create({ recipeId: id, date, servings })
    }, `${name} added to ${dayLabel}`)) onDone()
  }

  return (
    <form onSubmit={add} onKeyDown={(e) => e.key === 'Escape' && onDone()} className="flex flex-col gap-2">
      {recipes.length > 0 && (
        <select className={inputClass} aria-label={`Meal to add on ${dayLabel}`} required value={recipeId} autoFocus
          onChange={(e) => {
            setRecipeId(e.target.value)
            // Default to the recipe's own serving count.
            const recipe = recipes.find((r) => r.id === Number(e.target.value))
            if (recipe) setServings(recipe.servings)
          }}>
          <option value="">Choose a recipe…</option>
          <option value={NEW_RECIPE}>+ New recipe…</option>
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>{r.name ?? '(unnamed)'}</option>
          ))}
        </select>
      )}
      {creating && (
        <label className="flex flex-col gap-1 text-sm">
          New recipe name
          <input className={inputClass} placeholder="e.g. Tacos" required maxLength={200} autoFocus
            value={newName} onChange={(e) => setNewName(e.target.value)} />
        </label>
      )}
      <label className="flex items-center gap-2 text-sm">
        Servings
        <input type="number" inputMode="numeric" className={`${inputClass} w-16`}
          required min={1} max={100} value={servings} onChange={(e) => setServings(e.target.valueAsNumber)} />
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" className="flex-1">Add</Button>
        <Button onClick={onDone} className="flex-1">Cancel</Button>
      </div>
    </form>
  )
}

const NEW_RECIPE = 'new'
