import { useCallback, useEffect, useRef, useState } from 'react'

export function useResource(load) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [version, setVersion] = useState(0)
  const generation = useRef(0)
  const retry = useCallback(() => setVersion((value) => value + 1), [])
  const setData = useCallback((data) => {
    generation.current++
    setState({ data, loading: false, error: '' })
  }, [])
  useEffect(() => {
    const current = ++generation.current
    setState({ data: null, loading: true, error: '' })
    Promise.resolve().then(load).then(
      (data) => { if (current === generation.current) setState({ data, loading: false, error: '' }) },
      (error) => { if (current === generation.current) setState({ data: null, loading: false, error: error.message || 'Unable to load data.' }) },
    )
    return () => { generation.current++ }
  }, [load, version])
  return { ...state, retry, setData }
}
