import { Navigate, NavLink, Route, Routes } from 'react-router'
import IngredientsPage from './pages/IngredientsPage'
import PlanPage from './pages/PlanPage'
import RecipesPage from './pages/RecipesPage'
import ShoppingPage from './pages/ShoppingPage'

const links = [
  { to: '/plan', label: 'Week plan' },
  { to: '/recipes', label: 'Recipes' },
  { to: '/ingredients', label: 'Ingredients' },
  { to: '/shopping', label: 'Shopping list' },
]

export default function App() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 py-4 print:hidden dark:border-stone-800">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Meal Planner</h1>
        <nav className="flex flex-wrap gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 ${
                  isActive
                    ? 'bg-emerald-700 text-white dark:bg-emerald-500 dark:text-emerald-950'
                    : 'hover:bg-emerald-700/10 dark:hover:bg-emerald-400/10'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/ingredients" element={<IngredientsPage />} />
          <Route path="/shopping" element={<ShoppingPage />} />
          <Route path="*" element={<Navigate to="/plan" replace />} />
        </Routes>
      </main>
    </div>
  )
}
