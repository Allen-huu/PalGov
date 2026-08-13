import React from 'react'
import { useRouter } from '../router'

const TABS = [
  { key: 'notes', path: '/task-panel', label: '笔记', icon: '📋' },
  { key: 'quiz', path: '/quiz', label: '答题', icon: '✏️' },
  { key: 'wrong', path: '/wrong-book', label: '错题', icon: '📖' },
] as const

export const WrongBookPage: React.FC = () => {
  const { navigate, path } = useRouter()
  return <main style={s.root}>
    <Sidebar path={path} navigate={navigate} />
    <div style={s.content}>
      <div style={s.empty}>
        <div style={s.emoji}>🌱</div>
        <h2 style={s.emptyTitle}>错题本还很干净</h2>
        <p style={s.emptyDesc}>答题后答错的题目会自动收集到这里，方便你之后复习。</p>
        <button onClick={() => navigate('/quiz')} className="btn-primary" style={{ marginTop: 14, fontSize: 12, padding: '7px 16px' }}>去答题</button>
      </div>
    </div>
  </main>
}

function Sidebar({ path, navigate }: { path: string; navigate: (to: string) => void }) {
  const active = path === '/quiz' ? 'quiz' : path === '/wrong-book' ? 'wrong' : 'notes'
  return (
    <div style={sidebarStyle}>
      {TABS.map((tab) => (
        <button key={tab.key} onClick={() => navigate(tab.path)} style={{
          ...sidebarItem,
          background: active === tab.key ? 'var(--accent-bg)' : 'transparent',
          color: active === tab.key ? 'var(--accent)' : 'var(--text-tertiary)',
          fontWeight: active === tab.key ? 600 : 400,
        }} title={tab.label}>
          <span style={{ fontSize: 16 }}>{tab.icon}</span>
          <span style={{ fontSize: 10, marginTop: 2 }}>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}

const sidebarStyle: React.CSSProperties = {
  width: 56, flexShrink: 0,
  display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 4px',
  borderRight: '1px solid var(--panel-border)',
  background: 'rgba(0,0,0,0.02)',
}
const sidebarItem: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: 1, padding: '8px 4px', borderRadius: 10,
  border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
}

const s: Record<string, React.CSSProperties> = {
  root: { width: '100%', height: '100%', display: 'flex', background: 'var(--panel-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' },
  content: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
  empty: { flex: 1, textAlign: 'center' as const, padding: '20px 16px', overflowY: 'auto', animation: 'fadeIn 0.3s ease' },
  emoji: { fontSize: 36, marginBottom: 4 },
  emptyTitle: { fontSize: 15, fontWeight: 700, margin: '4px 0 4px' },
  emptyDesc: { color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5, marginTop: 4 },
}