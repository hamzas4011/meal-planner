import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './ui'

// infoOnly: nothing to confirm, just explains why something can't be done. Shows a single OK.
type ConfirmOptions = { title: string; message?: string; confirmLabel?: string; infoOnly?: boolean }
type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn>(async () => false)

// `const confirm = useConfirm(); if (await confirm({ title: 'Delete?' })) ...`
export const useConfirm = () => useContext(ConfirmContext)

// Styled replacement for window.confirm(). Uses the native <dialog> element, which gives
// keyboard support for free: focus stays inside, Escape cancels, and focus returns to
// the button that opened it.
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const resolve = useRef<(ok: boolean) => void>(() => {})
  const [options, setOptions] = useState<ConfirmOptions | null>(null)

  const confirm = useCallback<ConfirmFn>(
    (opts) => new Promise((res) => {
      resolve.current = res
      setOptions(opts)
    }),
    [],
  )

  useEffect(() => {
    if (options && !dialog.current?.open) dialog.current?.showModal()
  }, [options])

  function close(ok: boolean) {
    dialog.current?.close()
    resolve.current(ok)
    setOptions(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog ref={dialog} aria-labelledby="confirm-title" aria-describedby={options?.message ? 'confirm-message' : undefined}
        onCancel={(e) => { e.preventDefault(); close(false) }}
        className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-xl border border-stone-200 bg-white p-5 text-stone-700 shadow-xl backdrop:bg-stone-950/50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
        {options && (
          <>
            <h2 id="confirm-title" className="text-lg font-semibold text-stone-900 dark:text-stone-100">{options.title}</h2>
            {options.message && <p id="confirm-message" className="mt-2">{options.message}</p>}
            <div className="mt-5 flex justify-end gap-2">
              {options.infoOnly ? (
                <Button autoFocus variant="primary" onClick={() => close(false)}>OK</Button>
              ) : (
                <>
                  {/* Cancel gets focus first: the safe choice if Enter is pressed by accident. */}
                  <Button autoFocus onClick={() => close(false)}>Cancel</Button>
                  <Button variant="dangerSolid" onClick={() => close(true)}>{options.confirmLabel ?? 'Delete'}</Button>
                </>
              )}
            </div>
          </>
        )}
      </dialog>
    </ConfirmContext.Provider>
  )
}
