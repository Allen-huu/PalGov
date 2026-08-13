/**
 * 任务面板页 — 长条状，左侧竖向标签切换
 */
import React from 'react'
import { useTask } from '../hooks/useTask'
import { TaskItem } from '../components/TaskItem'
import { formatDateChinese } from '../utils/date'
import { useRouter } from '../router'

const TABS = [
  { key: 'notes', path: '/task-panel', label: '笔记', icon: '📋' },
  { key: 'quiz', path: '/quiz', label: '答题', icon: '✏️' },
  { key: 'wrong', path: '/wrong-book', label: '错题', icon: '📖' },
] as const

export const TaskPanelPage: React.FC = () => {
  const { tasks, loading, create, toggleDone, remove } = useTask()
  const [title, setTitle] = React.useState('')
  const [note, setNote] = React.useState('')
  const [dueTime, setDueTime] = React.useState('')
  const [expanded, setExpanded] = React.useState(false)
  const { navigate, path } = useRouter()

  const pending = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  const handleAdd = async () => {
    if (!title.trim()) return
    let dueAt: number | undefined
    if (dueTime) {
      const [h, m] = dueTime.split(':').map(Number)
      const d = new Date()
      d.setHours(h, m, 0, 0)
      dueAt = d.getTime()
    }
    await create({ title, note, dueAt })
    setTitle('')
    setNote('')
    setDueTime('')
    setExpanded(false)
  }

  return (
    <div style={s.root}>
      {/* 左侧竖向标签栏 */}
      <Sidebar path={path} navigate={navigate} />

      {/* 右侧内容区 */}
      <div style={s.content}>
        {/* 头部 */}
        <div style={s.header}>
          <div style={s.title}>{formatDateChinese()}</div>
          <div style={s.stats}>
            <span style={s.statBadge}>{pending.length} 待办</span>
            <span style={{ ...s.statBadge, background: 'var(--success-bg)', color: 'var(--success)' }}>{done.length} 已完成</span>
          </div>
        </div>

        {/* 任务列表 */}
        <div style={s.list}>
          {loading ? (
            <div style={s.centered}>加载中...</div>
          ) : tasks.length === 0 ? (
            <div style={s.empty}>
              <div style={s.emptyIcon}>☕</div>
              <div style={s.emptyTitle}>暂无任务</div>
              <div style={s.emptyDesc}>今天还没有安排，开始添加吧</div>
            </div>
          ) : (
            <>
              {pending.map((t) => (
                <TaskItem key={t.id} task={t} onToggle={() => toggleDone(t.id)} onDelete={() => remove(t.id)} />
              ))}
              {done.length > 0 && (
                <div style={s.sectionDivider}>已完成</div>
              )}
              {done.map((t) => (
                <TaskItem key={t.id} task={t} onToggle={() => toggleDone(t.id)} onDelete={() => remove(t.id)} />
              ))}
            </>
          )}
        </div>

        {/* 底部添加区 */}
        <div style={s.footer}>
          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6, animation: 'slideUp 0.2s ease' }}>
              <input placeholder="备注（可选）" value={note} onChange={(e) => setNote(e.target.value)} className="input-apple" style={{ width: '100%' }} />
              <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="input-apple" style={{ width: '100%' }} />
            </div>
          )}
          <div style={s.inputRow}>
            <button onClick={() => setExpanded(!expanded)} style={s.iconBtn} title="更多选项">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="3" cy="8" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                <circle cx="13" cy="8" r="1.5" fill="currentColor"/>
              </svg>
            </button>
            <input
              placeholder="添加任务..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="input-apple"
              style={{ flex: 1 }}
              autoFocus
            />
            <button onClick={handleAdd} className="btn-primary" disabled={!title.trim()} style={{ padding: '6px 12px', fontSize: 12 }}>
              添加
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 左侧竖向标签栏 */
function Sidebar({ path, navigate }: { path: string; navigate: (to: string) => void }) {
  const active = path === '/quiz' ? 'quiz' : path === '/wrong-book' ? 'wrong' : 'notes'
  return (
    <div style={sidebarStyle}>
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => navigate(tab.path)}
          style={{
            ...sidebarItem,
            background: active === tab.key ? 'var(--accent-bg)' : 'transparent',
            color: active === tab.key ? 'var(--accent)' : 'var(--text-tertiary)',
            fontWeight: active === tab.key ? 600 : 400,
          }}
          title={tab.label}
        >
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
  root: {
    width: '100%', height: '100%',
    background: 'var(--panel-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--panel-border)',
    boxShadow: 'var(--shadow-lg)',
    display: 'flex', overflow: 'hidden',
  },
  content: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0,
  },
  header: {
    padding: '8px 12px 6px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  title: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' },
  stats: { display: 'flex', gap: 4 },
  statBadge: {
    fontSize: 10, fontWeight: 600, padding: '2px 6px',
    borderRadius: 'var(--radius-full)', background: 'var(--accent-bg)', color: 'var(--accent)',
  },
  list: {
    flex: 1, overflowY: 'auto', padding: '0 8px',
  },
  centered: { textAlign: 'center' as const, color: 'var(--text-secondary)', padding: 20, fontSize: 12 },
  empty: {
    textAlign: 'center' as const, padding: '20px 12px',
    animation: 'fadeIn 0.3s ease',
  },
  emptyIcon: { fontSize: 28, marginBottom: 4 },
  emptyTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  emptyDesc: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 },
  sectionDivider: {
    fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)',
    padding: '4px 4px 2px', marginTop: 1, letterSpacing: '0.02em',
    textTransform: 'uppercase' as const,
  },
  footer: {
    borderTop: '1px solid var(--panel-border)', padding: '6px 8px 8px',
  },
  inputRow: {
    display: 'flex', gap: 4, alignItems: 'center',
  },
  iconBtn: {
    width: 28, height: 28, borderRadius: 'var(--radius-sm)',
    background: 'rgba(0,0,0,0.03)', color: 'var(--text-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
}