import type { ComponentType, SVGProps } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useSearchParams } from 'react-router'
import { ConfirmProvider } from './components/ConfirmDialog'
import { BookIcon, CalendarIcon, CartIcon, LeafIcon } from './components/icons'
import { addDays, fromIso, startOfWeek, toIso } from './dates'
import IngredientsPage from './pages/IngredientsPage'
import PlanPage from './pages/PlanPage'
import RecipesPage from './pages/RecipesPage'
import ShoppingPage from './pages/ShoppingPage'

type NavItem = { to: string; label: string; short: string; icon: ComponentType<SVGProps<SVGSVGElement>> }

// Ordered like the workflow: plan the week, then shop. Recipes and ingredients feed the plan.
const links: NavItem[] = [
  { to: '/plan', label: 'Week plan', short: 'Plan', icon: CalendarIcon },
  { to: '/recipes', label: 'Recipes', short: 'Recipes', icon: BookIcon },
  { to: '/ingredients', label: 'Ingredients', short: 'Ingredients', icon: LeafIcon },
  { to: '/shopping', label: 'Shopping list', short: 'Shopping', icon: CartIcon },
]

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600'

// Moving between the plan and the shopping list keeps you on the same week.
function linkTarget(to: string, pathname: string, params: URLSearchParams) {
  const fromPlan = to === '/shopping' && pathname === '/plan'
  const fromShopping = to === '/plan' && pathname === '/shopping'
  if (!fromPlan && !fromShopping) return to

  const day = fromIso(params.get(fromPlan ? 'week' : 'from'))
  if (!day) return to
  const start = startOfWeek(day)
  return fromPlan
    ? `/shopping?from=${toIso(start)}&to=${toIso(addDays(start, 6))}`
    : `/plan?week=${toIso(start)}`
}

export default function App() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()

  return (
    <ConfirmProvider>
      {/* Lets keyboard users jump past the navigation; only visible when focused. */}
      <a href="#main"
        className="sr-only rounded-md bg-emerald-700 px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50">
        Skip to content
      </a>

      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur print:hidden dark:border-stone-800 dark:bg-stone-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/plan" className={`flex items-center gap-2.5 rounded-lg ${focusRing}`}>
            <span className="grid size-9 place-items-center rounded-lg bg-emerald-700 text-white shadow-sm dark:bg-emerald-500 dark:text-emerald-950">
              <LeafIcon className="size-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Meal Planner</h1>
          </Link>

          {/* Desktop/tablet navigation */}
          <nav aria-label="Main" className="hidden sm:block">
            <ul className="flex gap-1">
              {links.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink to={linkTarget(to, pathname, params)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-lg px-3 py-2 font-medium ${focusRing} ${
                        isActive
                          ? 'bg-emerald-700 text-white dark:bg-emerald-500 dark:text-emerald-950'
                          : 'text-stone-700 hover:bg-emerald-700/10 dark:text-stone-300 dark:hover:bg-emerald-400/10'
                      }`
                    }>
                    <Icon className="size-4" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {/* Extra bottom padding on phones so the tab bar never covers content. */}
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pb-28 outline-none sm:pb-16">
        <Routes>
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/ingredients" element={<IngredientsPage />} />
          <Route path="/shopping" element={<ShoppingPage />} />
          <Route path="*" element={<Navigate to="/plan" replace />} />
        </Routes>
      </main>

      {/* Phone navigation: a bottom tab bar, within easy reach of the thumb. */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden print:hidden dark:border-stone-800 dark:bg-stone-950">
        <ul className="grid grid-cols-4">
          {links.map(({ to, short, icon: Icon }) => (
            <li key={to}>
              <NavLink to={linkTarget(to, pathname, params)}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${focusRing} ${
                    isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-600 dark:text-stone-400'
                  }`
                }>
                {({ isActive }) => (
                  <>
                    <span className={`grid h-7 w-12 place-items-center rounded-full ${isActive ? 'bg-emerald-700/10 dark:bg-emerald-400/15' : ''}`}>
                      <Icon className="size-5" />
                    </span>
                    {short}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Screen readers read out messages placed here by announce(). */}
      <div id="announcer" aria-live="polite" className="sr-only" />
    </ConfirmProvider>
  )
}
