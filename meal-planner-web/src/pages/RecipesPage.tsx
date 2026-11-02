import { useState } from 'react'
import { api, type Ingredient, type Recipe } from '../api'
import { Button, Card, CommitNumberInput, Empty, ErrorNotice, inputClass, PageTitle } from '../components/ui'
import { useApiData } from '../useApiData'

type Run = (action: () => Promise<unknown>) => Promise<boolean>

export default function RecipesPage() {
  const { data, error, run } = useApiData(
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
    if (await run(() => api.recipes.create({ name, servings }))) setName('')
  }

  return (
    <section>
      <PageTitle>Recipes</PageTitle>

      <Card className="mb-3">
        <form onSubmit={create} className="flex flex-wrap items-center gap-2">
          <input className={`${inputClass} min-w-0 flex-1`} placeholder="Recipe name" aria-label="Recipe name"
            required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
          <input type="number" className={`${inputClass} w-20`} aria-label="Servings" required min={1} max={100}
            value={servings} onChange={(e) => setServings(e.target.valueAsNumber)} />
          <span className="text-stone-500">servings</span>
          <Button type="submit" variant="primary">Create recipe</Button>
        </form>
      </Card>

      <ErrorNotice message={error} />

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

  return (
    <Card>
      {editing ? (
        <EditRecipeForm recipe={recipe} onCancel={() => setEditing(false)}
          onSave={async (dto) => {
            if (await run(() => api.recipes.update(recipe.id, dto))) setEditing(false)
          }} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 flex-1 font-semibold text-stone-900 dark:text-stone-100">
            {recipe.name ?? '(unnamed)'}
            <span className="font-normal text-stone-500"> · serves {recipe.servings}</span>
          </h3>
          <Button onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="danger"
            onClick={() => confirm(`Delete recipe "${recipe.name}"?`) && run(() => api.recipes.remove(recipe.id))}>
            Delete
          </Button>
        </div>
      )}

      {recipe.ingredients.length === 0 ? (
        <Empty>No ingredients yet.</Empty>
      ) : (
        <ul className="my-2 divide-y divide-stone-200 dark:divide-stone-800">
          {recipe.ingredients.map((ri) => (
            <li key={ri.id} className="flex flex-wrap items-center gap-2 py-1.5">
              <span className="min-w-0 flex-1">{ri.ingredientName ?? '(unnamed)'}</span>
              <CommitNumberInput label={`Quantity of ${ri.ingredientName}`} value={ri.quantity} min={0.01} step="any"
                onCommit={(quantity) =>
                  run(() => api.recipes.updateIngredient(recipe.id, ri.id, { ingredientId: ri.ingredientId, quantity }))} />
              <span className="w-10 text-stone-500">{ri.unit}</span>
              <Button variant="danger" aria-label={`Remove ${ri.ingredientName}`}
                onClick={() => run(() => api.recipes.removeIngredient(recipe.id, ri.id))}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AddIngredientForm recipe={recipe} allIngredients={allIngredients} run={run} />
    </Card>
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
    <form className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => { e.preventDefault(); onSave({ name, servings }) }}>
      <input className={`${inputClass} min-w-0 flex-1`} aria-label="Recipe name" required maxLength={200}
        value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <input type="number" className={`${inputClass} w-20`} aria-label="Servings" required min={1} max={100}
        value={servings} onChange={(e) => setServings(e.target.valueAsNumber)} />
      <span className="text-stone-500">servings</span>
      <Button type="submit" variant="primary">Save</Button>
      <Button onClick={onCancel}>Cancel</Button>
    </form>
  )
}

function AddIngredientForm({ recipe, allIngredients, run }: { recipe: Recipe; allIngredients: Ingredient[]; run: Run }) {
  const [ingredientId, setIngredientId] = useState('')
  const [quantity, setQuantity] = useState('')

  if (allIngredients.length === 0) {
    return <p className="text-stone-500">Add ingredients on the Ingredients page first.</p>
  }
  const used = new Set(recipe.ingredients.map((ri) => ri.ingredientId))
  const available = allIngredients.filter((i) => !used.has(i.id))
  if (available.length === 0) return null

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const ok = await run(() =>
      api.recipes.addIngredient(recipe.id, { ingredientId: Number(ingredientId), quantity: Number(quantity) }))
    if (ok) {
      setIngredientId('')
      setQuantity('')
    }
  }

  return (
    <form onSubmit={add} className="mt-2 flex flex-wrap items-center gap-2">
      <select className={inputClass} aria-label="Ingredient" required
        value={ingredientId} onChange={(e) => setIngredientId(e.target.value)}>
        <option value="">Add ingredient…</option>
        {available.map((i) => (
          <option key={i.id} value={i.id}>{i.unit ? `${i.name} (${i.unit})` : i.name}</option>
        ))}
      </select>
      <input type="number" className={`${inputClass} w-24`} aria-label="Quantity" placeholder="qty"
        required min={0.01} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      <Button type="submit">Add</Button>
    </form>
  )
}
