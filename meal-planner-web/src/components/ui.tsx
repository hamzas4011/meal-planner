import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'

export const inputClass =
  'rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-stone-900 ' +
  'focus:outline-2 focus:outline-offset-1 focus:outline-emerald-600 ' +
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
        `cursor-pointer rounded-md border px-3 py-1.5 focus:outline-2 focus:outline-offset-1 ` +
        `focus:outline-emerald-600 ${buttonVariants[variant]} ${className}`
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

export function PageTitle({ children }: { children: ReactNode }) {
  return <h2 className="mt-6 mb-3 text-xl font-semibold text-stone-900 dark:text-stone-100">{children}</h2>
}

export function ErrorNotice({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="my-3 rounded-md bg-red-50 px-3 py-2 text-red-700 print:hidden dark:bg-red-950 dark:text-red-300">
      {message}
    </p>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-1.5 text-stone-500 italic">{children}</p>
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
  useEffect(() => setText(String(value)), [value])

  return (
    <input
      type="number"
      aria-label={label}
      title={label}
      min={min}
      max={max}
      step={step}
      value={text}
      className={`${inputClass} ${className}`}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      onBlur={(e) => {
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
