/**
 * 极简 hash router：避免引入额外依赖，根据 location.hash 切换页面
 * 三个独立窗口共用同一个 renderer bundle，通过 hash 区分路由
 */
import React from 'react'

interface RouterContextValue {
  path: string
  navigate: (to: string) => void
}

const RouterContext = React.createContext<RouterContextValue>({
  path: '/',
  navigate: () => {}
})

export function HashRouter({ children }: { children: React.ReactNode }) {
  const [path, setPath] = React.useState(() => parseHash())

  React.useEffect(() => {
    const onHashChange = () => setPath(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = React.useCallback((to: string) => {
    window.location.hash = to
  }, [])

  return (
    <RouterContext.Provider value={{ path, navigate }}>{children}</RouterContext.Provider>
  )
}

export function Routes({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function Route({
  path,
  element
}: {
  path: string
  element: React.ReactNode
}) {
  const ctx = React.useContext(RouterContext)
  if (ctx.path !== path) return null
  return <>{element}</>
}

export function useRouter() {
  return React.useContext(RouterContext)
}

function parseHash(): string {
  const h = window.location.hash.replace(/^#/, '')
  return h || '/'
}
