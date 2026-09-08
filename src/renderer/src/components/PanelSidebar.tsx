/**
 * 面板共享侧边栏：备忘 / 念头 / 答题 / 错题 / 动态
 * 页面可通过局部覆盖 --accent 改变高亮色（如 B站页的粉色主题）
 */
import React from 'react'
import { useRouter } from '../router'

const TABS = [
  { key: 'notes', path: '/task-panel', label: '备忘', icon: '📋' },
  { key: 'thoughts', path: '/thoughts', label: '念头', icon: '✦' },
  { key: 'quiz', path: '/quiz', label: '答题', icon: '✏️' },
  { key: 'wrong', path: '/wrong-book', label: '错题', icon: '📖' },
  { key: 'bili', path: '/bilibili', label: '动态', icon: '📺' },
] as const

export const PanelSidebar: React.FC = () => {
  const { navigate, path } = useRouter()
  const active = path === '/thoughts' ? 'thoughts' : path === '/quiz' ? 'quiz' : path === '/wrong-book' ? 'wrong' : path === '/bilibili' ? 'bili' : 'notes'

  return (
    <nav className="panel-sidebar">
      <img className="sidebar-logo" src="/assets/palgo-icon.png" alt="PalGo" />
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={`sidebar-item${active === tab.key ? ' active' : ''}`}
          onClick={() => navigate(tab.path)}
          title={tab.label}
        >
          <span className="sidebar-icon">{tab.icon}</span>
          <span className="sidebar-label">{tab.label}</span>
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <button
        className="sidebar-item"
        onClick={() => window.pet.window.showSettings()}
        title="设置"
      >
        <span className="sidebar-icon">⚙</span>
        <span className="sidebar-label">设置</span>
      </button>
    </nav>
  )
}
