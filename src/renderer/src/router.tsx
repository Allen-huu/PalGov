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
  if (path === '*') return null // catch-all handled by Routes
  if (ctx.path !== path) return null
  return <>{element}</>
}

export function Routes({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const ctx = React.useContext(RouterContext)
  const childrenArr = React.Children.toArray(children)
  const matched = childrenArr.find((child: any) => child.props?.path === ctx.path)
  if (matched) return <>{matched}</>
  const catchAll = childrenArr.find((child: any) => child.props?.path === '*')
  if (catchAll) return <>{catchAll}</>
  return <>{fallback}</>
}

export function useRouter() {
  return React.useContext(RouterContext)
}

function parseHash(): string {
  const value = window.location.hash.replace(/^#/, '')
  if (!value) return '/'
  return value.startsWith('/') ? value : `/${value}`
}
