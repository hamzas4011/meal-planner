import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'

// focus-visible: show the focus ring for keyboard users, not on every mouse click.
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600'

export const inputClass =
  `rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-stone-900 ${focusRing} ` +
  'dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100'

const buttonVariants = {
  default:
    'border-stone-300 bg-white text-stone-900 hover:border-stone-400 ' +
    'dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-500',
  primary:
    'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800 ' +
    'dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400',
  danger:
    'border-stone-300 bg-white text-red-700 hover:border-red-700 hover:bg-red-50 ' +
    'dark:border-stone-700 dark:bg-stone-900 dark:text-red-400 dark:hover:border-red-400 dark:hover:bg-red-950',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonVariants }

export function Button({ variant = 'default', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={
        `cursor-pointer rounded-md border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-60 ` +
        `${focusRing} ${buttonVariants[variant]} ${className}`
      }
      {...props}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900 ${className}`}>
      {children}
    </div>
  )
}

// The first page shown after the app opens should not steal focus; later navigations should.
let firstPage = true

// Page heading. Also sets the browser tab title, and on navigation moves focus here so
// screen-reader and keyboard users start at the new page instead of the old nav link.
export function PageTitle({ children }: { children: string }) {
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    document.title = `${children} · Meal Planner`
    if (firstPage) firstPage = false
    else ref.current?.focus()
  }, [children])

  return (
    <h2 ref={ref} tabIndex={-1} className="mt-6 mb-3 text-xl font-semibold text-stone-900 outline-none dark:text-stone-100">
      {children}
    </h2>
  )
}

// A label shown above its input, so it stays visible while typing (placeholders disappear).
export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      <span className="font-medium text-stone-700 dark:text-stone-300">{label}</span>
      {children}
    </label>
  )
}

export function ErrorNotice({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="my-3 rounded-md bg-red-50 px-3 py-2 text-red-700 print:hidden dark:bg-red-950 dark:text-red-300">
      {message}
    </p>
  )
}

// Helpful hint (not an error), e.g. "create a recipe first".
export function InfoNotice({ children }: { children: ReactNode }) {
  return (
    <p className="my-3 rounded-md bg-emerald-50 px-3 py-2 text-emerald-900 print:hidden dark:bg-emerald-950 dark:text-emerald-200">
      {children}
    </p>
  )
}

export function Loading() {
  return (
    <p role="status" className="py-3 text-stone-500 dark:text-stone-400">
      Loading…
    </p>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-1.5 text-stone-500 italic dark:text-stone-400">{children}</p>
}

export const linkClass =
  `rounded-sm text-emerald-700 underline underline-offset-2 hover:text-emerald-800 ${focusRing} ` +
  'dark:text-emerald-400 dark:hover:text-emerald-300'

// Screen readers don't notice when a list silently updates, so actions announce
// what happened ("Tomato added") through a polite live region rendered in App.
export function announce(message: string) {
  const region = document.getElementById('announcer')
  if (!region) return
  region.textContent = ''
  // Clearing first makes the same message be read again if it repeats.
  setTimeout(() => (region.textContent = message), 50)
}

// Number field that saves only when you leave it or press Enter, not on every keystroke.
export function CommitNumberInput({
  value,
  onCommit,
  label,
  min,
  max,
  step,
  className = 'w-20',
}: {
  value: number
  onCommit: (value: number) => void
  label: string
  min?: number
  max?: number
  step?: number | 'any'
  className?: string
}) {
  const [text, setText] = useState(String(value))
  const cancelled = useRef(false)
  useEffect(() => setText(String(value)), [value])

  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={label}
      title={label}
      min={min}
      max={max}
      step={step}
      value={text}
      className={`${inputClass} ${className}`}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          cancelled.current = true
          e.currentTarget.blur()
        }
      }}
      onBlur={(e) => {
        if (cancelled.current) {
          cancelled.current = false
          setText(String(value)) // Escape: undo the edit, don't save
          return
        }
        const n = e.currentTarget.valueAsNumber
        if (!e.currentTarget.checkValidity() || Number.isNaN(n)) {
          setText(String(value)) // invalid: put the saved value back
          return
        }
        if (n !== value) onCommit(n)
      }}
    />
  )
}
