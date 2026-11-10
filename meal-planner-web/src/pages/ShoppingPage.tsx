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
  const setRange = (newFrom: string, newTo: string) => setParams({ from: newFrom, to: newTo }, { replace: true })

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
        {/* The list updates as soon as a date changes. If the range would end before it starts,
            the other date moves along, so the range is always valid. */}
        <div className="flex flex-wrap items-end gap-3">
          <Field label="From" className="min-w-36 flex-1 sm:flex-none">
            <input type="date" required value={from} className={inputClass}
              onChange={(e) => e.target.value && setRange(e.target.value, e.target.value > to ? e.target.value : to)} />
          </Field>
          <Field label="To" className="min-w-36 flex-1 sm:flex-none">
            <input type="date" required value={to} className={inputClass}
              onChange={(e) => e.target.value && setRange(e.target.value < from ? e.target.value : from, e.target.value)} />
          </Field>
          <Button onClick={() => window.print()} className="w-full sm:w-auto"><PrinterIcon className="size-4" /> Print</Button>
        </div>
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
