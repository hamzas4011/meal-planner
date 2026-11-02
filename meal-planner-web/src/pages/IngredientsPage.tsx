import { useState } from 'react'
import { api, type Ingredient } from '../api'
import { Button, Card, Empty, ErrorNotice, inputClass, PageTitle } from '../components/ui'
import { useApiData } from '../useApiData'

export default function IngredientsPage() {
  const { data: ingredients, error, run } = useApiData(() => api.ingredients.list(), [])
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (await run(() => api.ingredients.create({ name, unit: unit || null }))) {
      setName('')
      setUnit('')
    }
  }

  return (
    <section>
      <PageTitle>Ingredients</PageTitle>

      <Card className="mb-3">
        <form onSubmit={add} className="flex flex-wrap items-center gap-2">
          <input className={`${inputClass} min-w-0 flex-1`} placeholder="e.g. Tomato" aria-label="Ingredient name"
            required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          <input className={`${inputClass} w-40`} placeholder="unit (g, ml, pcs)" aria-label="Unit"
            maxLength={20} value={unit} onChange={(e) => setUnit(e.target.value)} />
          <Button type="submit" variant="primary">Add ingredient</Button>
        </form>
      </Card>

      <ErrorNotice message={error} />

      {ingredients && (
        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
          {ingredients.length === 0 && <li><Empty>No ingredients yet. Add one above.</Empty></li>}
          {ingredients.map((i) =>
            i.id === editingId ? (
              <EditRow key={i.id} ingredient={i} onCancel={() => setEditingId(null)}
                onSave={async (dto) => {
                  if (await run(() => api.ingredients.update(i.id, dto))) setEditingId(null)
                }} />
            ) : (
              <li key={i.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="min-w-0 flex-1">
                  {i.name ?? '(unnamed)'}
                  {i.unit && <span className="text-stone-500"> ({i.unit})</span>}
                </span>
                <Button onClick={() => setEditingId(i.id)}>Edit</Button>
                <Button variant="danger"
                  onClick={() => confirm(`Delete "${i.name}"?`) && run(() => api.ingredients.remove(i.id))}>
                  Delete
                </Button>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  )
}

function EditRow({ ingredient, onSave, onCancel }: {
  ingredient: Ingredient
  onSave: (dto: { name: string; unit: string | null }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(ingredient.name ?? '')
  const [unit, setUnit] = useState(ingredient.unit ?? '')

  return (
    <li className="py-2">
      <form className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => { e.preventDefault(); onSave({ name, unit: unit || null }) }}>
        <input className={`${inputClass} min-w-0 flex-1`} aria-label="Name" required maxLength={100}
          value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <input className={`${inputClass} w-40`} aria-label="Unit" placeholder="unit" maxLength={20}
          value={unit} onChange={(e) => setUnit(e.target.value)} />
        <Button type="submit" variant="primary">Save</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </form>
    </li>
  )
}
