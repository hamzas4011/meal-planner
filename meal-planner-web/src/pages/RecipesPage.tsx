import { useState } from 'react'
import { Link } from 'react-router'
import { api, type Ingredient, type Recipe } from '../api'
import {
  Button, Card, CommitNumberInput, Empty, ErrorNotice, Field, inputClass, linkClass, Loading, PageTitle,
} from '../components/ui'
import { useConfirm } from '../components/ConfirmDialog'
import { useApiData } from '../useApiData'

type Run = (action: () => Promise<unknown>, success?: string) => Promise<boolean>

export default function RecipesPage() {
  const { data, error, loading, run } = useApiData(
    async () => {
      const [recipes, ingredients] = await Promise.all([api.recipes.list(), api.ingredients.list()])
      return { recipes, ingredients }
    },
    [],
  )
  const [name, setName] = useState('')
  const [servings, setServings] = useState(2)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (await run(() => api.recipes.create({ name, servings }), `Recipe ${name.trim()} created`)) setName('')
  }

  return (
    <section>
      <PageTitle description="Your recipes and what goes into them.">Recipes</PageTitle>

      <Card className="mb-3">
        <form onSubmit={create} className="flex flex-wrap items-end gap-2">
          <Field label="Recipe name" className="min-w-48 flex-1">
            <input className={inputClass} placeholder="e.g. Pasta bolognese"
              required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Servings" className="w-24">
            <input type="number" inputMode="numeric" className={inputClass} required min={1} max={100}
              value={servings} onChange={(e) => setServings(e.target.valueAsNumber)} />
          </Field>
          <Button type="submit" variant="primary">Create recipe</Button>
        </form>
      </Card>

      <ErrorNotice message={error} />
      {loading && <Loading />}

      {data && (
        <div className="grid gap-3">
          {data.recipes.length === 0 && <Empty>No recipes yet. Create one above.</Empty>}
          {data.recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} allIngredients={data.ingredients} run={run} />
          ))}
        </div>
      )}
    </section>
  )
}

function RecipeCard({ recipe, allIngredients, run }: { recipe: Recipe; allIngredients: Ingredient[]; run: Run }) {
  const [editing, setEditing] = useState(false)
  const confirm = useConfirm()
  const title = recipe.name ?? '(unnamed)'

  return (
    // <article> + heading lets screen-reader users jump between recipes.
    <article aria-label={title}>
      <Card>
        {editing ? (
          <EditRecipeForm recipe={recipe} onCancel={() => setEditing(false)}
            onSave={async (dto) => {
              if (await run(() => api.recipes.update(recipe.id, dto), `Recipe ${dto.name.trim()} saved`)) setEditing(false)
            }} />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 flex-1 font-semibold text-stone-900 dark:text-stone-100">
              {title}
              <span className="font-normal text-stone-500 dark:text-stone-400"> · serves {recipe.servings}</span>
            </h3>
            <Button aria-label={`Edit recipe ${title}`} onClick={() => setEditing(true)}>Edit</Button>
            <Button variant="danger" aria-label={`Delete recipe ${title}`}
              onClick={async () => {
                if (await confirm({ title: `Delete "${title}"?`, message: 'The recipe and its ingredient list will be removed.' }))
                  run(() => api.recipes.remove(recipe.id), `Recipe ${title} deleted`)
              }}>
              Delete
            </Button>
          </div>
        )}

        {recipe.ingredients.length === 0 ? (
          // If no ingredients exist at all, the form below already explains what to do.
          allIngredients.length > 0 && <Empty>No ingredients yet. Add the first one below.</Empty>
        ) : (
          <ul className="my-2 divide-y divide-stone-200 dark:divide-stone-800" aria-label={`Ingredients in ${title}`}>
            {recipe.ingredients.map((ri) => (
              <li key={ri.id} className="flex flex-wrap items-center gap-2 py-1.5">
                <span className="min-w-0 flex-1">{ri.ingredientName ?? '(unnamed)'}</span>
                <CommitNumberInput label={`Quantity of ${ri.ingredientName}${ri.unit ? ` in ${ri.unit}` : ''}`}
                  value={ri.quantity} min={0.01} step="any"
                  onCommit={(quantity) =>
                    run(() => api.recipes.updateIngredient(recipe.id, ri.id, { ingredientId: ri.ingredientId, quantity }),
                      `${ri.ingredientName} updated to ${quantity}${ri.unit ? ` ${ri.unit}` : ''}`)} />
                <span className="w-10 text-stone-500 dark:text-stone-400" aria-hidden="true">{ri.unit}</span>
                <Button variant="danger" aria-label={`Remove ${ri.ingredientName} from ${title}`}
                  onClick={() => run(() => api.recipes.removeIngredient(recipe.id, ri.id), `${ri.ingredientName} removed`)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <AddIngredientForm recipe={recipe} allIngredients={allIngredients} run={run} />
      </Card>
    </article>
  )
}

function EditRecipeForm({ recipe, onSave, onCancel }: {
  recipe: Recipe
  onSave: (dto: { name: string; servings: number }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(recipe.name ?? '')
  const [servings, setServings] = useState(recipe.servings)

  return (
    <form className="flex flex-wrap items-end gap-2"
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      onSubmit={(e) => { e.preventDefault(); onSave({ name, servings }) }}>
      <Field label="Recipe name" className="min-w-48 flex-1">
        <input className={inputClass} required maxLength={200}
          value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="Servings" className="w-24">
        <input type="number" inputMode="numeric" className={inputClass} required min={1} max={100}
          value={servings} onChange={(e) => setServings(e.target.valueAsNumber)} />
      </Field>
      <Button type="submit" variant="primary">Save</Button>
      <Button onClick={onCancel}>Cancel</Button>
    </form>
  )
}

function AddIngredientForm({ recipe, allIngredients, run }: { recipe: Recipe; allIngredients: Ingredient[]; run: Run }) {
  const [ingredientId, setIngredientId] = useState('')
  const [quantity, setQuantity] = useState('')
  const title = recipe.name ?? '(unnamed)'

  if (allIngredients.length === 0) {
    return (
      <p className="text-stone-500 dark:text-stone-400">
        No ingredients exist yet. <Link to="/ingredients" className={linkClass}>Add ingredients</Link> first.
      </p>
    )
  }
  const used = new Set(recipe.ingredients.map((ri) => ri.ingredientId))
  const available = allIngredients.filter((i) => !used.has(i.id))
  if (available.length === 0) return null

  const selected = available.find((i) => i.id === Number(ingredientId))

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const ok = await run(
      () => api.recipes.addIngredient(recipe.id, { ingredientId: Number(ingredientId), quantity: Number(quantity) }),
      `${selected?.name} added to ${title}`)
    if (ok) {
      setIngredientId('')
      setQuantity('')
    }
  }

  return (
    <form onSubmit={add} className="mt-2 flex flex-wrap items-center gap-2">
      <select className={inputClass} aria-label={`Ingredient to add to ${title}`} required
        value={ingredientId} onChange={(e) => setIngredientId(e.target.value)}>
        <option value="">Add ingredient…</option>
        {available.map((i) => (
          <option key={i.id} value={i.id}>{i.unit ? `${i.name} (${i.unit})` : i.name}</option>
        ))}
      </select>
      <input type="number" inputMode="decimal" className={`${inputClass} w-24`}
        aria-label={`Quantity${selected?.unit ? ` in ${selected.unit}` : ''}`} placeholder={selected?.unit ?? 'qty'}
        required min={0.01} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      <Button type="submit" aria-label={`Add ingredient to ${title}`}>Add</Button>
    </form>
  )
}
