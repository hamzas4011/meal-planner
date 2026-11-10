import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { api, type Ingredient, type Recipe } from '../api'
import { XIcon } from '../components/icons'
import {
  Button, Card, CommitNumberInput, CommitTextInput, Empty, ErrorNotice, Field, inputClass, linkClass, Loading, PageTitle,
  summarize,
} from '../components/ui'
import { useConfirm } from '../components/ConfirmDialog'
import { formatDay, fromIso } from '../dates'
import { useApiData } from '../useApiData'

type Run = (action: () => Promise<unknown>, success?: string) => Promise<boolean>

export default function RecipesPage() {
  const { data, error, loading, run, dismissError } = useApiData(
    async () => {
      const [recipes, ingredients, meals] = await Promise.all([
        api.recipes.list(), api.ingredients.list(), api.plannedMeals.list(),
      ])
      return { recipes, ingredients, meals }
    },
    [],
  )
  const [name, setName] = useState('')
  const [servings, setServings] = useState(2)
  // A recipe that was just created opens ready for its ingredients.
  const [newRecipeId, setNewRecipeId] = useState<number | null>(null)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const ok = await run(async () => {
      const created = await api.recipes.create({ name, servings })
      setNewRecipeId(created.id)
    }, `Recipe ${name.trim()} created. Add its ingredients.`)
    if (ok) setName('')
  }

  return (
    <section>
      <PageTitle description="Your recipes and what goes into them."
        actions={<Link to="/ingredients" className={linkClass}>Manage ingredients</Link>}>
        Recipes
      </PageTitle>

      <Card className="mb-3">
        <form onSubmit={create} className="flex flex-wrap items-end gap-2">
          <Field label="Recipe name" className="min-w-36 flex-1">
            <input className={inputClass} placeholder="e.g. Pasta bolognese"
              required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Servings" className="w-24">
            <input type="number" inputMode="numeric" className={inputClass} required min={1} max={100}
              value={servings} onChange={(e) => setServings(e.target.valueAsNumber)} />
          </Field>
          <Button type="submit" variant="primary" className="w-full sm:w-auto">Create recipe</Button>
        </form>
      </Card>

      <ErrorNotice message={error} onDismiss={dismissError} />
      {loading && <Loading />}

      {data && (
        <div className="grid gap-3">
          {data.recipes.length === 0 && <Empty>No recipes yet. Create one above.</Empty>}
          {data.recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} allIngredients={data.ingredients} isNew={r.id === newRecipeId} run={run}
              plannedDates={data.meals.filter((m) => m.recipeId === r.id).map((m) => m.date)} />
          ))}
        </div>
      )}
    </section>
  )
}

function RecipeCard({ recipe, allIngredients, isNew, plannedDates, run }: {
  recipe: Recipe
  allIngredients: Ingredient[]
  isNew: boolean
  plannedDates: string[]
  run: Run
}) {
  const [editing, setEditing] = useState(isNew)
  const editButton = useRef<HTMLButtonElement>(null)
  const confirm = useConfirm()
  const title = recipe.name ?? '(unnamed)'

  function stopEditing() {
    setEditing(false)
    // Put focus back on the Edit button, so keyboard users don't get lost.
    setTimeout(() => editButton.current?.focus())
  }

  async function deleteRecipe() {
    if (plannedDates.length > 0) {
      const days = [...new Set(plannedDates)].map((d) => formatDay(fromIso(d)!))
      await confirm({
        title: `Can't delete "${title}" yet`,
        message: `It's in your week plan on ${summarize(days)}. Remove it from the plan first.`,
        infoOnly: true,
      })
      return
    }
    if (await confirm({ title: `Delete "${title}"?`, message: 'The recipe and its ingredient list will be removed.' }))
      run(() => api.recipes.remove(recipe.id), `Recipe ${title} deleted`)
  }

  return (
    // <article> + heading lets screen-reader users jump between recipes.
    <article aria-label={title}>
      <Card>
        {editing ? (
          <RecipeEditor recipe={recipe} allIngredients={allIngredients} focusIngredient={isNew} run={run} onDone={stopEditing} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 flex-1 font-semibold text-stone-900 dark:text-stone-100">
                {title}
                <span className="font-normal text-stone-500 dark:text-stone-400"> · serves {recipe.servings}</span>
              </h3>
              <Button ref={editButton} aria-label={`Edit recipe ${title}`} onClick={() => setEditing(true)}>Edit</Button>
              <Button variant="danger" aria-label={`Delete recipe ${title}`} onClick={deleteRecipe}>
                Delete
              </Button>
            </div>

            {recipe.ingredients.length === 0 ? (
              <Empty>No ingredients yet. Press Edit to add some.</Empty>
            ) : (
              <ul className="mt-2 divide-y divide-stone-200 dark:divide-stone-800" aria-label={`Ingredients in ${title}`}>
                {recipe.ingredients.map((ri) => (
                  <li key={ri.id} className="flex items-baseline justify-between gap-3 py-1.5">
                    <span className="min-w-0">{ri.ingredientName ?? '(unnamed)'}</span>
                    <span className="text-stone-600 tabular-nums dark:text-stone-400">
                      {ri.quantity}{ri.unit ? ` ${ri.unit}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>
    </article>
  )
}

// Everything here saves as you go, so there is one way out: Done.
function RecipeEditor({ recipe, allIngredients, focusIngredient, run, onDone }: {
  recipe: Recipe
  allIngredients: Ingredient[]
  focusIngredient: boolean
  run: Run
  onDone: () => void
}) {
  const title = recipe.name ?? '(unnamed)'
  const save = (dto: { name: string; servings: number }) =>
    run(() => api.recipes.update(recipe.id, dto), `Recipe ${dto.name} saved`)

  return (
    <>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Recipe name" className="min-w-36 flex-1">
          <CommitTextInput value={recipe.name ?? ''} maxLength={200} autoFocus={!focusIngredient}
            onCommit={(name) => save({ name, servings: recipe.servings })} />
        </Field>
        <Field label="Servings" className="w-24">
          <CommitNumberInput label={`Servings of ${title}`} value={recipe.servings} min={1} max={100} className="w-full"
            onCommit={(servings) => save({ name: recipe.name ?? '', servings })} />
        </Field>
      </div>

      {recipe.ingredients.length > 0 && (
        <ul className="mt-3 divide-y divide-stone-200 dark:divide-stone-800" aria-label={`Ingredients in ${title}`}>
          {recipe.ingredients.map((ri) => (
            <li key={ri.id} className="flex flex-wrap items-center gap-2 py-1.5">
              <span className="min-w-0 flex-1">{ri.ingredientName ?? '(unnamed)'}</span>
              <CommitNumberInput label={`Quantity of ${ri.ingredientName}${ri.unit ? ` in ${ri.unit}` : ''}`}
                value={ri.quantity} min={0.01} step="any"
                onCommit={(quantity) =>
                  run(() => api.recipes.updateIngredient(recipe.id, ri.id, { ingredientId: ri.ingredientId, quantity }),
                    `${ri.ingredientName} updated to ${quantity}${ri.unit ? ` ${ri.unit}` : ''}`)} />
              <span className="w-14 text-stone-500 dark:text-stone-400" aria-hidden="true">{ri.unit}</span>
              <Button variant="ghost" title="Remove"
                className="min-h-11 min-w-11 px-1.5 text-stone-500 hover:text-red-700 dark:text-stone-400 dark:hover:text-red-400"
                aria-label={`Remove ${ri.ingredientName} from ${title}`}
                onClick={() => run(() => api.recipes.removeIngredient(recipe.id, ri.id), `${ri.ingredientName} removed`)}>
                <XIcon className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AddIngredientForm recipe={recipe} allIngredients={allIngredients} autoFocus={focusIngredient} run={run} />

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-stone-200 pt-3 dark:border-stone-800">
        <p className="text-sm text-stone-600 dark:text-stone-400">Changes save automatically.</p>
        <Button variant="primary" aria-label={`Done editing ${title}`} onClick={onDone}>Done</Button>
      </div>
    </>
  )
}

const NEW_INGREDIENT = 'new'

// Finds an ingredient the user retyped, so it isn't created twice. A different unit counts
// as a different ingredient: "Garlic (g)" must not turn into that many "Garlic (cloves)".
function findExisting(ingredients: Ingredient[], name: string, unit: string) {
  const same = (a: string | null, b: string) => (a ?? '').toLowerCase() === b.toLowerCase()
  return ingredients.find((i) => same(i.name, name) && (!unit || same(i.unit, unit)))
}

function AddIngredientForm({ recipe, allIngredients, autoFocus, run }: {
  recipe: Recipe
  allIngredients: Ingredient[]
  autoFocus: boolean
  run: Run
}) {
  const [choice, setChoice] = useState('')
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [quantity, setQuantity] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const selectField = useRef<HTMLSelectElement>(null)
  const nameField = useRef<HTMLInputElement>(null)
  const title = recipe.name ?? '(unnamed)'

  const used = new Set(recipe.ingredients.map((ri) => ri.ingredientId))
  const available = allIngredients.filter((i) => !used.has(i.id))
  // With nothing left to pick from, the only option is typing a new one.
  const creating = choice === NEW_INGREDIENT || available.length === 0
  const selected = creating ? undefined : available.find((i) => i.id === Number(choice))
  const unit = creating ? newUnit.trim() : selected?.unit

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const typedName = newName.trim()
    const typedUnit = newUnit.trim()
    if (creating && !typedName) {
      setProblem('Enter a name for the new ingredient.')
      return
    }

    const match = creating ? findExisting(allIngredients, typedName, typedUnit) : selected
    if (match && used.has(match.id)) {
      setProblem(`${match.name} is already in this recipe. Change its amount above instead.`)
      return
    }
    setProblem(null)

    const ok = await run(async () => {
      const ingredientId = match?.id ?? (await api.ingredients.create({ name: typedName, unit: typedUnit || null })).id
      await api.recipes.addIngredient(recipe.id, { ingredientId, quantity: Number(quantity) })
    }, `${match?.name ?? typedName} added to ${title}`)

    if (ok) {
      setChoice('')
      setNewName('')
      setNewUnit('')
      setQuantity('')
      // Ready for the next one.
      setTimeout(() => (selectField.current ?? nameField.current)?.focus())
    }
  }

  return (
    <form onSubmit={add} className="mt-3">
      <div className="flex flex-wrap items-end gap-2">
        {available.length > 0 && (
          <Field label="Add an ingredient" className="w-full sm:w-auto sm:min-w-48 sm:flex-1">
            <select ref={selectField} className={inputClass} required value={choice} autoFocus={autoFocus}
              onChange={(e) => { setChoice(e.target.value); setProblem(null) }}>
              <option value="">Choose…</option>
              <option value={NEW_INGREDIENT}>+ New ingredient…</option>
              {available.map((i) => (
                <option key={i.id} value={i.id}>{i.unit ? `${i.name} (${i.unit})` : i.name}</option>
              ))}
            </select>
          </Field>
        )}
        {creating && (
          <>
            <Field label="New ingredient" className="min-w-40 flex-1">
              <input ref={nameField} className={inputClass} placeholder="e.g. Tomato" required maxLength={100}
                autoFocus={autoFocus || choice === NEW_INGREDIENT}
                value={newName} onChange={(e) => { setNewName(e.target.value); setProblem(null) }} />
            </Field>
            <Field label="Unit (optional)" className="min-w-24 flex-1 sm:w-32 sm:flex-none">
              <input className={inputClass} placeholder="g, ml, pcs" maxLength={20}
                value={newUnit} onChange={(e) => { setNewUnit(e.target.value); setProblem(null) }} />
            </Field>
          </>
        )}
        <Field label={`Amount${unit ? ` (${unit})` : ''}`} className="min-w-24 flex-1 sm:w-28 sm:flex-none">
          <input type="number" inputMode="decimal" className={inputClass}
            required min={0.01} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Button type="submit" className="flex-1 sm:flex-none" aria-label={`Add ingredient to ${title}`}>Add</Button>
      </div>
      {problem && <p role="alert" className="mt-2 text-red-700 dark:text-red-300">{problem}</p>}
    </form>
  )
}
