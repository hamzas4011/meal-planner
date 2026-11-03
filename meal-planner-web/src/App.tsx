import { Navigate, NavLink, Route, Routes } from 'react-router'
import IngredientsPage from './pages/IngredientsPage'
import PlanPage from './pages/PlanPage'
import RecipesPage from './pages/RecipesPage'
import ShoppingPage from './pages/ShoppingPage'

// Ordered like the workflow: plan the week, then shop. Recipes and ingredients feed the plan.
const links = [
  { to: '/plan', label: 'Week plan' },
  { to: '/recipes', label: 'Recipes' },
  { to: '/ingredients', label: 'Ingredients' },
  { to: '/shopping', label: 'Shopping list' },
]

export default function App() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-12">
      {/* Lets keyboard users jump past the navigation; only visible when focused. */}
      <a href="#main"
        className="sr-only rounded-md bg-emerald-700 px-3 py-2 text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10">
        Skip to content
      </a>

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 py-4 print:hidden dark:border-stone-800">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Meal Planner</h1>
        <nav aria-label="Main">
          <ul className="flex flex-wrap gap-1">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600 ${
                      isActive
                        ? 'bg-emerald-700 text-white dark:bg-emerald-500 dark:text-emerald-950'
                        : 'hover:bg-emerald-700/10 dark:hover:bg-emerald-400/10'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="outline-none">
        <Routes>
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/ingredients" element={<IngredientsPage />} />
          <Route path="/shopping" element={<ShoppingPage />} />
          <Route path="*" element={<Navigate to="/plan" replace />} />
        </Routes>
      </main>

      {/* Screen readers read out messages placed here by announce(). */}
      <div id="announcer" aria-live="polite" className="sr-only" />
    </div>
  )
}
