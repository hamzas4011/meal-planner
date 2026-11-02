import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { api } from '../api'
import { Button, Card, Empty, ErrorNotice, inputClass, PageTitle } from '../components/ui'
import { addDays, fromIso, startOfWeek, toIso } from '../dates'
import { useApiData } from '../useApiData'

function formatQuantity(q: number) {
  return Number(q.toFixed(2)).toString()
}

export default function ShoppingPage() {
  // The range lives in the URL (/shopping?from=...&to=...); defaults to this week.
  const [params, setParams] = useSearchParams()
  const monday = startOfWeek(new Date())
  const from = toIso(fromIso(params.get('from')) ?? monday)
  const to = toIso(fromIso(params.get('to')) ?? addDays(monday, 6))

  const { data: items, error } = useApiData(() => api.shoppingList.get(from, to), [from, to])
  const [checked, setChecked] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <section>
      <PageTitle>Shopping list</PageTitle>

      <Card className="mb-3 print:hidden">
        <form className="flex flex-wrap items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const form = new FormData(e.currentTarget)
            setParams({ from: String(form.get('from')), to: String(form.get('to')) })
            setChecked(new Set())
          }}>
          <label className="flex items-center gap-2">
            From <input type="date" name="from" required defaultValue={from} key={`from-${from}`} className={inputClass} />
          </label>
          <label className="flex items-center gap-2">
            To <input type="date" name="to" required defaultValue={to} key={`to-${to}`} className={inputClass} />
          </label>
          <Button type="submit" variant="primary">Show list</Button>
          <Button onClick={() => window.print()}>Print</Button>
        </form>
      </Card>

      <ErrorNotice message={error} />

      {items && (
        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
          {items.length === 0 && (
            <li><Empty>Nothing to buy: no meals with ingredients are planned in this range.</Empty></li>
          )}
          {items.map((item) => {
            const key = `${item.name}|${item.unit}`
            const done = checked.has(key)
            return (
              <li key={key} className="flex items-center gap-3 py-2">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={done} onChange={() => toggle(key)} className="size-4 accent-emerald-700" />
                  <span className={done ? 'text-stone-400 line-through' : ''}>{item.name ?? '(unnamed)'}</span>
                </label>
                <span className="text-stone-900 tabular-nums dark:text-stone-100">
                  {formatQuantity(item.quantity)}{item.unit ? ` ${item.unit}` : ''}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
