/**
 * 极简 hash router：根据 location.hash 切换页面
 */
import React from 'react'

interface RouterCtx {
  path: string
  navigate: (to: string) => void
}

const RouterContext = React.createContext<RouterCtx>({ path: '/', navigate: () => {} })

export function HashRouter({ children }: { children: React.ReactNode }) {
  const [path, setPath] = React.useState(() => parseHash())

  React.useEffect(() => {
    const h = () => setPath(parseHash())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])

  return <RouterContext.Provider value={{ path, navigate: (to) => { window.location.hash = to } }}>{children}</RouterContext.Provider>
}

export function Route({ path, element }: { path: string; element: React.ReactNode }) {
  const ctx = React.useContext(RouterContext)
  if (path !== '*' && ctx.path !== path) return null
  return <>{element}</>
}

export function useRouter() {
  return React.useContext(RouterContext)
}

function parseHash(): string {
  const value = window.location.hash.replace(/^#/, '')
  if (!value) return '/'
  return value.startsWith('/') ? value : `/${value}`
}
