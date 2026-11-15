import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Small data-loading hook: handles loading, error and refetch states so every
 * page can render proper loading / error / empty UI without duplication.
 */
export default function useAsync(asyncFn, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState('')
  const mounted = useRef(true)
  const fnRef = useRef(asyncFn)
  fnRef.current = asyncFn

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const run = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fnRef.current()
      if (mounted.current) setData(result)
      return result
    } catch (requestError) {
      if (mounted.current) setError(requestError.message)
      return null
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (immediate) run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, refetch: run, setData }
}
