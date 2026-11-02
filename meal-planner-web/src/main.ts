import './style.css'

type Recipe = {
  id: number
  name: string | null
  servings: number
}

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <h1>Meal Planner</h1>
  <h2>Recipes</h2>
  <p id="status">Loading...</p>
  <ul id="recipes"></ul>
`

async function loadRecipes() {
  const status = document.querySelector<HTMLParagraphElement>('#status')!
  const list = document.querySelector<HTMLUListElement>('#recipes')!

  try {
    const res = await fetch('/api/recipes')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const recipes: Recipe[] = await res.json()

    status.textContent = recipes.length ? '' : 'No recipes yet.'
    list.innerHTML = ''
    for (const r of recipes) {
      const li = document.createElement('li')
      li.textContent = `${r.name ?? '(unnamed)'} - ${r.servings} servings`
      list.appendChild(li)
    }
  } catch (err) {
    status.textContent = `Could not reach the API: ${(err as Error).message}`
  }
}

loadRecipes()
