import { useCallback, useEffect, useRef, useState } from 'react'

// Loads data for a page and exposes `run` for actions (create, update, delete):
// run the action, reload the data, and show any error message from the API.
export function useApiData<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const latest = useRef(0)

  const reload = useCallback(async () => {
    const request = ++latest.current
    try {
      const result = await loader()
      if (request !== latest.current) return // a newer load started (e.g. week changed); drop this one
      setData(result)
      setError(null)
    } catch (err) {
      if (request === latest.current) setError((err as Error).message)
    }
  }, deps)

  useEffect(() => {
    reload()
  }, [reload])

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action()
        await reload()
        return true
      } catch (err) {
        setError((err as Error).message)
        return false
      }
    },
    [reload],
  )

  return { data, error, run }
}
