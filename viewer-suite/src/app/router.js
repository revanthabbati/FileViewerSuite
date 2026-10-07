import { useEffect, useState } from 'react'

// Hash routing keeps deep links working on static hosting (GitHub Pages) with no server rewrites.
export const ROUTES = ['home', 'eml', 'edi', 'parquet']

function parse() {
  const key = window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  return ROUTES.includes(key) ? key : 'home'
}

export function navigate(route) {
  const target = route === 'home' ? '#/' : `#/${route}`
  if (window.location.hash !== target) window.location.hash = target
}

export function useRoute() {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const onChange = () => {
      setRoute(parse())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
