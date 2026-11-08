import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type Ref } from 'react'
import { XIcon } from './icons'

// focus-visible: show the focus ring for keyboard users, not on every mouse click.
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600'

// text-base (16px) matters: iPhones zoom the whole page when a field with smaller text gets focus.
export const inputClass =
  `rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-base text-stone-900 ${focusRing} ` +
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
  dangerSolid:
    'border-red-700 bg-red-700 text-white hover:bg-red-800 ' +
    'dark:border-red-500 dark:bg-red-500 dark:text-red-950 dark:hover:bg-red-400',
  ghost:
    'border-transparent bg-transparent text-emerald-800 hover:bg-emerald-700/10 ' +
    'dark:text-emerald-300 dark:hover:bg-emerald-400/10',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants
  ref?: Ref<HTMLButtonElement> // React 19: refs are plain props on function components
}

export function Button({ variant = 'default', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={
        `inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 ` +
        `disabled:cursor-not-allowed disabled:opacity-60 ` +
        `${focusRing} ${buttonVariants[variant]} ${className}`
      }
      {...props}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:shadow-none ${className}`}>
      {children}
    </div>
  )
}

// The first page shown after the app opens should not steal focus; later navigations should.
let firstPage = true

// Page heading. Also sets the browser tab title, and on navigation moves focus here so
// screen-reader and keyboard users start at the new page instead of the old nav link.
export function PageTitle({ children, description, actions }: {
  children: string
  description?: string
  actions?: ReactNode
}) {
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    document.title = `${children} · Meal Planner`
    if (firstPage) firstPage = false
    else ref.current?.focus()
  }, [children])

  return (
    <div className="mt-8 mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 ref={ref} tabIndex={-1} className="text-2xl font-bold tracking-tight text-stone-900 outline-none sm:text-3xl dark:text-stone-100">
          {children}
        </h2>
        {description && <p className="mt-1 text-stone-600 dark:text-stone-400">{description}</p>}
      </div>
      {actions}
    </div>
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

// Fixed under the header, so it is seen even when the action happened far down the page.
export function ErrorNotice({ message, onDismiss }: { message: string | null; onDismiss?: () => void }) {
  if (!message) return null
  return (
    <div role="alert" className="fixed inset-x-4 top-20 z-30 mx-auto flex max-w-lg items-start gap-1 rounded-lg border border-red-200 bg-red-50 py-1 pr-1 pl-3 text-red-700 shadow-lg print:hidden dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      <p className="min-w-0 flex-1 py-2">{message}</p>
      {onDismiss && (
        <Button variant="ghost" className="min-h-11 min-w-11 text-red-700! dark:text-red-300!" aria-label="Dismiss message" onClick={onDismiss}>
          <XIcon className="size-4" />
        </Button>
      )}
    </div>
  )
}

// "A", "A and B", "A, B and C", "A, B and 2 more": keeps messages short when a list is long.
export function summarize(items: string[], max = 3) {
  const shown = items.slice(0, max)
  const extra = items.length - shown.length
  if (extra > 0) return `${shown.join(', ')} and ${extra} more`
  if (shown.length < 2) return shown.join('')
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`
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

// Text field that saves only when you leave it or press Enter. Use inside a <Field> for its label.
export function CommitTextInput({
  value,
  onCommit,
  maxLength,
  autoFocus,
}: {
  value: string
  onCommit: (value: string) => void
  maxLength?: number
  autoFocus?: boolean
}) {
  const [text, setText] = useState(value)
  const cancelled = useRef(false)
  useEffect(() => setText(value), [value])

  return (
    <input
      className={inputClass}
      maxLength={maxLength}
      autoFocus={autoFocus}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          cancelled.current = true
          e.currentTarget.blur()
        }
      }}
      onBlur={() => {
        const trimmed = text.trim()
        if (cancelled.current || !trimmed) {
          cancelled.current = false
          setText(value) // Escape or left empty: put the saved value back
          return
        }
        if (trimmed !== value) onCommit(trimmed)
      }}
    />
  )
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
