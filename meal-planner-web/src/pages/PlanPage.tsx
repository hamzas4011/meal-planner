import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { api, type PlannedMeal, type Recipe } from '../api'
import {
  Button, Card, CommitNumberInput, ErrorNotice, InfoNotice, inputClass, linkClass, Loading, PageTitle,
} from '../components/ui'
import { addDays, formatDay, fromIso, startOfWeek, toIso } from '../dates'
import { useApiData } from '../useApiData'

type Run = (action: () => Promise<unknown>, success?: string) => Promise<boolean>

export default function PlanPage() {
  // The week lives in the URL (/plan?week=2026-11-02) so it survives a refresh and can be linked.
  const [params, setParams] = useSearchParams()
  const weekStart = startOfWeek(fromIso(params.get('week')) ?? new Date())
  const from = toIso(weekStart)
  const to = toIso(addDays(weekStart, 6))
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const { data, error, loading, run } = useApiData(
    async () => {
      const [recipes, meals] = await Promise.all([api.recipes.list(), api.plannedMeals.list(from, to)])
      return { recipes, meals }
    },
    [from, to],
  )

  const goToWeek = (start: Date) => setParams({ week: toIso(start) })
  const today = toIso(new Date())
  const isThisWeek = from === toIso(startOfWeek(new Date()))
  const weekLabel = `${formatDay(days[0])} – ${formatDay(days[6])}`

  return (
    <section>
      <PageTitle>Week plan</PageTitle>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button onClick={() => goToWeek(addDays(weekStart, -7))} aria-label="Previous week">← Previous</Button>
        <Button onClick={() => setParams({})} aria-current={isThisWeek ? 'date' : undefined}>This week</Button>
        <Button onClick={() => goToWeek(addDays(weekStart, 7))} aria-label="Next week">Next →</Button>
        {/* Announced when the week changes, so screen-reader users know where they are. */}
        <span className="ml-2 font-semibold text-stone-900 dark:text-stone-100" aria-live="polite">
          {weekLabel}
        </span>
        <Link to={`/shopping?from=${from}&to=${to}`} className={`ml-auto ${linkClass}`}>
          Shopping list for this week →
        </Link>
      </div>

      <ErrorNotice message={error} />
      {loading && <Loading />}
      {data && data.recipes.length === 0 && (
        <InfoNotice>
          You need at least one recipe before you can plan meals.{' '}
          <Link to="/recipes" className={linkClass}>Create a recipe</Link>
        </InfoNotice>
      )}

      {data && (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3" aria-label={`Days, ${weekLabel}`}>
          {days.map((day) => {
            const iso = toIso(day)
            return (
              <li key={iso} className="flex">
                <DayCard date={iso} label={formatDay(day)} isToday={iso === today}
                  meals={data.meals.filter((m) => m.date === iso)} recipes={data.recipes} run={run} />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function DayCard({ date, label, isToday, meals, recipes, run }: {
  date: string
  label: string
  isToday: boolean
  meals: PlannedMeal[]
  recipes: Recipe[]
  run: Run
}) {
  return (
    <Card className={`flex w-full flex-col gap-1 ${isToday ? 'border-emerald-600 ring-1 ring-emerald-600 dark:border-emerald-500 dark:ring-emerald-500' : ''}`}>
      <h3 className="flex items-center gap-2 font-semibold text-stone-900 dark:text-stone-100">
        {label}
        {/* Text, not just the green border: colour alone isn't enough to show "today". */}
        {isToday && (
          <span className="rounded bg-emerald-700 px-1.5 text-xs font-medium text-white dark:bg-emerald-500 dark:text-emerald-950">
            Today
          </span>
        )}
      </h3>

      {meals.length === 0 ? (
        <p className="text-stone-500 dark:text-stone-400">Nothing planned</p>
      ) : (
        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
          {meals.map((m) => (
            <li key={m.id} className="flex items-center gap-2 py-1.5">
              <span className="min-w-0 flex-1 break-words">{m.recipeName ?? '(unnamed)'}</span>
              <CommitNumberInput label={`Servings of ${m.recipeName} on ${label}`} value={m.servings} min={1} max={100}
                className="w-16"
                onCommit={(servings) =>
                  run(() => api.plannedMeals.update(m.id, { recipeId: m.recipeId, date: m.date, servings }),
                    `${m.recipeName} on ${label}: ${servings} servings`)} />
              <Button variant="danger" className="px-2.5" aria-label={`Remove ${m.recipeName} from ${label}`} title="Remove"
                onClick={() => run(() => api.plannedMeals.remove(m.id), `${m.recipeName} removed from ${label}`)}>
                <span aria-hidden="true">×</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {recipes.length > 0 && <AddMealForm date={date} dayLabel={label} recipes={recipes} run={run} />}
    </Card>
  )
}

function AddMealForm({ date, dayLabel, recipes, run }: { date: string; dayLabel: string; recipes: Recipe[]; run: Run }) {
  const [recipeId, setRecipeId] = useState('')
  const [servings, setServings] = useState(2)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const recipe = recipes.find((r) => r.id === Number(recipeId))
    if (await run(() => api.plannedMeals.create({ recipeId: Number(recipeId), date, servings }),
      `${recipe?.name} added to ${dayLabel}`)) setRecipeId('')
  }

  return (
    <form onSubmit={add} className="mt-auto flex items-center gap-2 pt-1">
      <select className={`${inputClass} w-0 flex-1`} aria-label={`Meal to add on ${dayLabel}`} required value={recipeId}
        onChange={(e) => {
          setRecipeId(e.target.value)
          // Default to the recipe's own serving count.
          const recipe = recipes.find((r) => r.id === Number(e.target.value))
          if (recipe) setServings(recipe.servings)
        }}>
        <option value="">Add meal…</option>
        {recipes.map((r) => (
          <option key={r.id} value={r.id}>{r.name ?? '(unnamed)'}</option>
        ))}
      </select>
      <input type="number" inputMode="numeric" className={`${inputClass} w-16`} aria-label={`Servings on ${dayLabel}`}
        title="Servings" required min={1} max={100} value={servings} onChange={(e) => setServings(e.target.valueAsNumber)} />
      <Button type="submit" className="px-2.5" aria-label={`Add meal on ${dayLabel}`} title="Add">
        <span aria-hidden="true">+</span>
      </Button>
    </form>
  )
}
