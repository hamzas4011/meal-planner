// Types mirror the DTOs in MealPlanner.Api/DTOs.

export type Ingredient = {
  id: number
  name: string | null
  unit: string | null
}

export type RecipeIngredient = {
  id: number
  ingredientId: number
  ingredientName: string | null
  unit: string | null
  quantity: number
}

export type Recipe = {
  id: number
  name: string | null
  servings: number
  ingredients: RecipeIngredient[]
}

export type PlannedMeal = {
  id: number
  recipeId: number
  recipeName: string | null
  date: string // yyyy-MM-dd
  servings: number
}

export type ShoppingListItem = {
  name: string | null
  unit: string | null
  quantity: number
}

export class ApiError extends Error {}

// Pulls a readable message out of an error response: our controllers return
// { message }, model validation returns ProblemDetails with an `errors` map.
async function errorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data?.message === 'string') return data.message
    if (data?.errors) return Object.values(data.errors as Record<string, string[]>).flat().join(' ')
    if (typeof data?.title === 'string') return data.title
  } catch {
    // not JSON; fall through
  }
  return `Request failed (HTTP ${res.status})`
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Could not reach the API. Is the backend running?')
  }

  if (!res.ok) throw new ApiError(await errorMessage(res))

  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  ingredients: {
    list: () => request<Ingredient[]>('GET', '/ingredients'),
    create: (dto: { name: string; unit: string | null }) => request<Ingredient>('POST', '/ingredients', dto),
    update: (id: number, dto: { name: string; unit: string | null }) => request<void>('PUT', `/ingredients/${id}`, dto),
    remove: (id: number) => request<void>('DELETE', `/ingredients/${id}`),
  },

  recipes: {
    list: () => request<Recipe[]>('GET', '/recipes'),
    create: (dto: { name: string; servings: number }) => request<Recipe>('POST', '/recipes', dto),
    update: (id: number, dto: { name: string; servings: number }) => request<void>('PUT', `/recipes/${id}`, dto),
    remove: (id: number) => request<void>('DELETE', `/recipes/${id}`),
    addIngredient: (id: number, dto: { ingredientId: number; quantity: number }) =>
      request<RecipeIngredient>('POST', `/recipes/${id}/ingredients`, dto),
    updateIngredient: (id: number, recipeIngredientId: number, dto: { ingredientId: number; quantity: number }) =>
      request<void>('PUT', `/recipes/${id}/ingredients/${recipeIngredientId}`, dto),
    removeIngredient: (id: number, recipeIngredientId: number) =>
      request<void>('DELETE', `/recipes/${id}/ingredients/${recipeIngredientId}`),
  },

  plannedMeals: {
    // Without a range, returns every planned meal.
    list: (from?: string, to?: string) =>
      request<PlannedMeal[]>('GET', from && to ? `/plannedmeals?from=${from}&to=${to}` : '/plannedmeals'),
    create: (dto: { recipeId: number; date: string; servings: number }) =>
      request<PlannedMeal>('POST', '/plannedmeals', dto),
    update: (id: number, dto: { recipeId: number; date: string; servings: number }) =>
      request<void>('PUT', `/plannedmeals/${id}`, dto),
    remove: (id: number) => request<void>('DELETE', `/plannedmeals/${id}`),
  },

  shoppingList: {
    get: (from: string, to: string) => request<ShoppingListItem[]>('GET', `/shoppinglist?from=${from}&to=${to}`),
  },
}
