import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { api } from '../api'
import {
  Button, Card, Empty, ErrorNotice, Field, inputClass, linkClass, Loading, PageTitle,
} from '../components/ui'
import { addDays, fromIso, startOfWeek, toIso } from '../dates'
import { PrinterIcon } from '../components/icons'
import { useApiData } from '../useApiData'

function formatQuantity(q: number) {
  return Number(q.toFixed(2)).toString()
}

// Ticked items are remembered per date range in this browser, so they survive a refresh
// (handy when the phone screen locks in the shop).
function loadChecked(storageKey: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

export default function ShoppingPage() {
  // The range lives in the URL (/shopping?from=...&to=...); defaults to this week.
  const [params, setParams] = useSearchParams()
  const monday = startOfWeek(new Date())
  const from = toIso(fromIso(params.get('from')) ?? monday)
  const to = toIso(fromIso(params.get('to')) ?? addDays(monday, 6))
  const storageKey = `shopping-checked:${from}:${to}`

  const { data: items, error, loading, dismissError } = useApiData(() => api.shoppingList.get(from, to), [from, to])
  const [checked, setChecked] = useState<Set<string>>(() => loadChecked(storageKey))
  const [rangeError, setRangeError] = useState<string | null>(null)

  useEffect(() => setChecked(loadChecked(storageKey)), [storageKey])

  function save(next: Set<string>) {
    setChecked(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]))
    } catch {
      // storage blocked (e.g. private mode): ticks just won't survive a refresh
    }
  }

  function toggle(key: string) {
    const next = new Set(checked)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    save(next)
  }

  const keys = items?.map((i) => `${i.name}|${i.unit}`) ?? []
  const doneCount = keys.filter((k) => checked.has(k)).length

  return (
    <section>
      <PageTitle description="Everything you need for the planned meals, added up.">Shopping list</PageTitle>

      <Card className="mb-3 print:hidden">
        <form className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const form = new FormData(e.currentTarget)
            const newFrom = String(form.get('from'))
            const newTo = String(form.get('to'))
            // Check here so the user gets a clear message next to the dates.
            if (newFrom > newTo) {
              setRangeError('"From" must be on or before "To".')
              return
            }
            setRangeError(null)
            setParams({ from: newFrom, to: newTo })
          }}>
          <Field label="From">
            <input type="date" name="from" required defaultValue={from} key={`from-${from}`} className={inputClass}
              aria-describedby={rangeError ? 'range-error' : undefined} aria-invalid={rangeError ? true : undefined} />
          </Field>
          <Field label="To">
            <input type="date" name="to" required defaultValue={to} key={`to-${to}`} className={inputClass}
              aria-describedby={rangeError ? 'range-error' : undefined} aria-invalid={rangeError ? true : undefined} />
          </Field>
          <Button type="submit" variant="primary">Show list</Button>
          <Button onClick={() => window.print()}><PrinterIcon className="size-4" /> Print</Button>
        </form>
        {rangeError && (
          <p id="range-error" role="alert" className="mt-2 text-red-700 dark:text-red-300">{rangeError}</p>
        )}
      </Card>

      <ErrorNotice message={error} onDismiss={dismissError} />
      {loading && <Loading />}

      {items && items.length > 0 && (
        <div className="mb-1 flex flex-wrap items-center gap-3 print:hidden">
          <p className="text-stone-500 dark:text-stone-400" aria-live="polite">
            {doneCount} of {items.length} items ticked off
          </p>
          {doneCount > 0 && <Button onClick={() => save(new Set())}>Untick all</Button>}
        </div>
      )}

      {items && (
        <ul className="divide-y divide-stone-200 dark:divide-stone-800" aria-label="Items to buy">
          {items.length === 0 && (
            <li>
              <Empty>
                Nothing to buy: no meals with ingredients are planned in this range.{' '}
                <Link to={`/plan?week=${from}`} className={`not-italic ${linkClass}`}>Plan meals</Link>
              </Empty>
            </li>
          )}
          {items.map((item, index) => {
            const key = keys[index]
            const done = checked.has(key)
            return (
              <li key={key}>
                {/* The whole row is one big click/tap target. */}
                <label className="flex cursor-pointer items-center gap-3 py-2.5">
                  <input type="checkbox" checked={done} onChange={() => toggle(key)} className="size-5 shrink-0 accent-emerald-700" />
                  <span className={`min-w-0 flex-1 ${done ? 'text-stone-500 line-through dark:text-stone-400' : ''}`}>
                    {item.name ?? '(unnamed)'}
                  </span>
                  <span className={`tabular-nums ${done ? 'text-stone-500 line-through dark:text-stone-400' : 'text-stone-900 dark:text-stone-100'}`}>
                    {formatQuantity(item.quantity)}{item.unit ? ` ${item.unit}` : ''}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
