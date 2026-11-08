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

  const goToWeek = (start: Date) => setParams({ week: toIso(start) })
  const today = toIso(new Date())
  const isThisWeek = from === toIso(startOfWeek(new Date()))
  const weekLabel = `${formatDayMonth(days[0])} – ${formatDayMonth(days[6])}`

  return (
    <section>
      <PageTitle description="Plan what you'll eat each day of the week."
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

      {data && data.recipes.length === 0 && (
        <Welcome onExample={() => run(() => addExampleData(weekStart), 'Example recipes added and planned')} />
      )}

      {data && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={`Days, ${weekLabel}`}>
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

// First-visit guide, shown until the first recipe exists: explains the flow and offers example data.
function Welcome({ onExample }: { onExample: () => Promise<boolean> }) {
  const [busy, setBusy] = useState(false)
  const steps = [
    { icon: BookIcon, title: 'Create a recipe', text: 'Name it and add what goes in it.', to: '/recipes' },
    { icon: CalendarIcon, title: 'Plan your week', text: 'Pick a recipe for each day below.', to: null },
    { icon: CartIcon, title: 'Go shopping', text: 'Get one list with everything added up.', to: '/shopping' },
  ]

  return (
    <Card className="mb-4 border-emerald-200 bg-linear-to-br from-emerald-50 to-white dark:border-emerald-900 dark:from-emerald-950/60 dark:to-stone-900">
      <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Welcome to Meal Planner</h3>
      <p className="mt-1 text-stone-600 dark:text-stone-400">Here's how it works:</p>

      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
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

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-emerald-200/70 pt-4 dark:border-emerald-900">
        <Button variant="primary" className="w-full sm:w-auto" disabled={busy} aria-busy={busy}
          onClick={async () => { setBusy(true); await onExample(); setBusy(false) }}>
          <SparklesIcon className="size-4" /> {busy ? 'Adding examples…' : 'Try it with example recipes'}
        </Button>
        <span className="text-sm text-stone-600 dark:text-stone-400">
          Adds 3 recipes with ingredients and plans them for the week below.
        </span>
      </div>
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

      {meals.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {meals.map((m) => (
            <li key={m.id} className="rounded-lg bg-stone-50 py-1.5 pr-1 pl-2.5 dark:bg-stone-800/60">
              <p className="font-medium break-words text-stone-900 dark:text-stone-100">{m.recipeName ?? '(unnamed)'}</p>
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
        ) : recipes.length > 0 ? (
          <Button ref={addButton} variant="ghost" className="w-full justify-start border-dashed border-stone-300! dark:border-stone-700!"
            aria-label={`Add meal on ${label}`} onClick={() => setAdding(true)}>
            <PlusIcon className="size-4" /> Add meal
          </Button>
        ) : (
          meals.length === 0 && <p className="text-sm text-stone-500 dark:text-stone-400">Nothing planned</p>
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
  const [servings, setServings] = useState(2)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const recipe = recipes.find((r) => r.id === Number(recipeId))
    if (await run(() => api.plannedMeals.create({ recipeId: Number(recipeId), date, servings }),
      `${recipe?.name} added to ${dayLabel}`)) onDone()
  }

  return (
    <form onSubmit={add} onKeyDown={(e) => e.key === 'Escape' && onDone()} className="flex flex-col gap-2">
      <select className={inputClass} aria-label={`Meal to add on ${dayLabel}`} required value={recipeId} autoFocus
        onChange={(e) => {
          setRecipeId(e.target.value)
          // Default to the recipe's own serving count.
          const recipe = recipes.find((r) => r.id === Number(e.target.value))
          if (recipe) setServings(recipe.servings)
        }}>
        <option value="">Choose a recipe…</option>
        {recipes.map((r) => (
          <option key={r.id} value={r.id}>{r.name ?? '(unnamed)'}</option>
        ))}
      </select>
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
