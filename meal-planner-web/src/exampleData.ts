import { api } from './api'
import { addDays, toIso } from './dates'

// A few starter recipes so a new visitor sees a filled-in app right away.
const ingredients = [
  { name: 'Pasta', unit: 'g' },
  { name: 'Minced beef', unit: 'g' },
  { name: 'Tomato', unit: 'pcs' },
  { name: 'Onion', unit: 'pcs' },
  { name: 'Garlic', unit: 'cloves' },
  { name: 'Rice', unit: 'g' },
  { name: 'Chicken breast', unit: 'g' },
  { name: 'Broccoli', unit: 'g' },
  { name: 'Tortilla', unit: 'pcs' },
  { name: 'Lettuce', unit: 'pcs' },
  { name: 'Cheese', unit: 'g' },
]

const recipes = [
  {
    name: 'Pasta bolognese', servings: 4, day: 0,
    items: { Pasta: 400, 'Minced beef': 400, Tomato: 4, Onion: 1, Garlic: 2 },
  },
  {
    name: 'Chicken, rice & broccoli', servings: 2, day: 2,
    items: { Rice: 150, 'Chicken breast': 300, Broccoli: 250, Garlic: 1 },
  },
  {
    name: 'Tacos', servings: 4, day: 4,
    items: { Tortilla: 8, 'Minced beef': 400, Tomato: 2, Lettuce: 1, Cheese: 150, Onion: 1 },
  },
]

// Reuses ingredients/recipes that already exist (matched by name), so running it twice
// doesn't create duplicates. Plans the recipes into the given week.
export async function addExampleData(weekStart: Date) {
  const existingIngredients = await api.ingredients.list()
  const ingredientIds = new Map(existingIngredients.map((i) => [(i.name ?? '').toLowerCase(), i.id]))

  for (const ing of ingredients) {
    if (!ingredientIds.has(ing.name.toLowerCase())) {
      const created = await api.ingredients.create(ing)
      ingredientIds.set(ing.name.toLowerCase(), created.id)
    }
  }

  const existingRecipes = await api.recipes.list()
  for (const r of recipes) {
    let recipe = existingRecipes.find((x) => (x.name ?? '').toLowerCase() === r.name.toLowerCase())
    if (!recipe) {
      recipe = await api.recipes.create({ name: r.name, servings: r.servings })
      for (const [name, quantity] of Object.entries(r.items)) {
        await api.recipes.addIngredient(recipe.id, { ingredientId: ingredientIds.get(name.toLowerCase())!, quantity })
      }
    }
    await api.plannedMeals.create({ recipeId: recipe.id, date: toIso(addDays(weekStart, r.day)), servings: r.servings })
  }
}
