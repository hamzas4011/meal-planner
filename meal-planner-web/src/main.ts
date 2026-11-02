import './style.css'
import { h } from './dom'
import { ingredientsView } from './views/ingredients'
import { planView } from './views/plan'
import { recipesView } from './views/recipes'
import { shoppingView } from './views/shopping'

// Hash routes: #plan, #recipes, #ingredients, #shopping
const routes = {
  plan: { label: 'Week plan', view: planView },
  recipes: { label: 'Recipes', view: recipesView },
  ingredients: { label: 'Ingredients', view: ingredientsView },
  shopping: { label: 'Shopping list', view: shoppingView },
}
type Route = keyof typeof routes

const app = document.querySelector<HTMLDivElement>('#app')!
const main = h('main')
const links = Object.entries(routes).map(([key, r]) => h('a', { href: `#${key}`, 'data-route': key }, r.label))

app.replaceChildren(
  h('header', {}, h('h1', {}, 'Meal Planner'), h('nav', {}, links)),
  main,
)

function currentRoute(): Route {
  const key = location.hash.slice(1)
  return key in routes ? (key as Route) : 'plan'
}

function render() {
  const route = currentRoute()
  for (const link of links) {
    if (link.dataset.route === route) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  }
  main.replaceChildren(routes[route].view())
}

window.addEventListener('hashchange', render)
render()
