import { useRef, useState } from 'react'
import { api, type Ingredient } from '../api'
import { Button, Card, Empty, ErrorNotice, Field, inputClass, Loading, PageTitle } from '../components/ui'
import { useConfirm } from '../components/ConfirmDialog'
import { useApiData } from '../useApiData'

export default function IngredientsPage() {
  const { data: ingredients, error, loading, run } = useApiData(() => api.ingredients.list(), [])
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const nameInput = useRef<HTMLInputElement>(null)
  const confirm = useConfirm()

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const added = name.trim()
    if (await run(() => api.ingredients.create({ name, unit: unit || null }), `${added} added`)) {
      setName('')
      setUnit('')
      nameInput.current?.focus() // ready for the next one
    }
  }

  const query = search.trim().toLowerCase()
  const shown = ingredients?.filter((i) => (i.name ?? '').toLowerCase().includes(query)) ?? []

  return (
    <section>
      <PageTitle description="Everything your recipes can use.">Ingredients</PageTitle>

      <Card className="mb-3">
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <Field label="Name" className="min-w-40 flex-1">
            <input ref={nameInput} className={inputClass} placeholder="e.g. Tomato"
              required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Unit (optional)" className="w-40">
            <input className={inputClass} placeholder="g, ml, pcs"
              maxLength={20} value={unit} onChange={(e) => setUnit(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary">Add ingredient</Button>
        </form>
      </Card>

      <ErrorNotice message={error} />
      {loading && <Loading />}

      {ingredients && ingredients.length > 5 && (
        <Field label="Search ingredients" className="mb-2 max-w-sm">
          <input type="search" className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
      )}

      {ingredients && (
        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
          {ingredients.length === 0 && <li><Empty>No ingredients yet. Add one above.</Empty></li>}
          {ingredients.length > 0 && shown.length === 0 && <li><Empty>No ingredients match "{search}".</Empty></li>}
          {shown.map((i) =>
            i.id === editingId ? (
              <EditRow key={i.id} ingredient={i} onCancel={() => setEditingId(null)}
                onSave={async (dto) => {
                  if (await run(() => api.ingredients.update(i.id, dto), `${dto.name.trim()} saved`)) setEditingId(null)
                }} />
            ) : (
              <li key={i.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="min-w-0 flex-1">
                  {i.name ?? '(unnamed)'}
                  {i.unit && <span className="text-stone-500 dark:text-stone-400"> ({i.unit})</span>}
                </span>
                <Button aria-label={`Edit ${i.name}`} onClick={() => setEditingId(i.id)}>Edit</Button>
                <Button variant="danger" aria-label={`Delete ${i.name}`}
                  onClick={async () => {
                    if (await confirm({ title: `Delete "${i.name}"?`, message: 'It will be removed from your ingredient list.' }))
                      run(() => api.ingredients.remove(i.id), `${i.name} deleted`)
                  }}>
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
      <form className="flex flex-wrap items-end gap-2"
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        onSubmit={(e) => { e.preventDefault(); onSave({ name, unit: unit || null }) }}>
        <Field label="Name" className="min-w-40 flex-1">
          <input className={inputClass} required maxLength={100}
            value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Unit (optional)" className="w-40">
          <input className={inputClass} maxLength={20} value={unit} onChange={(e) => setUnit(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary">Save</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </form>
    </li>
  )
}
