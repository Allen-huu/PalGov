/**
 * 任务面板页 — 长条状，左侧竖向标签切换
 */
import React from 'react'
import { useTask } from '../hooks/useTask'
import { TaskItem } from '../components/TaskItem'
import { PanelSidebar } from '../components/PanelSidebar'
import { formatDateChinese } from '../utils/date'

export const TaskPanelPage: React.FC = () => {
  const { tasks, loading, create, toggleDone, remove } = useTask()
  const [title, setTitle] = React.useState('')
  const [note, setNote] = React.useState('')
  const [dueTime, setDueTime] = React.useState('')
  const [expanded, setExpanded] = React.useState(false)

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
    <main className="panel-root">
      <PanelSidebar />

      {/* 右侧内容区 */}
      <div style={s.content}>
        {/* 头部 */}
        <div style={s.header}>
          <div style={s.title}>{formatDateChinese()}</div>
          <div style={s.stats}>
            <span className="badge">{pending.length} 待办</span>
            <span className="badge" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>{done.length} 已完成</span>
          </div>
        </div>

        {/* 任务列表：iOS 提醒事项式白色分组卡片 */}
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
              {pending.length > 0 && (
                <div style={s.cardGroup}>
                  {pending.map((t) => (
                    <TaskItem key={t.id} task={t} onToggle={() => toggleDone(t.id)} onDelete={() => remove(t.id)} />
                  ))}
                </div>
              )}
              {done.length > 0 && (
                <>
                  <div className="section-title">已完成</div>
                  <div style={s.cardGroup}>
                    {done.map((t) => (
                      <TaskItem key={t.id} task={t} onToggle={() => toggleDone(t.id)} onDelete={() => remove(t.id)} />
                    ))}
                  </div>
                </>
              )}
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
            <button onClick={handleAdd} className="btn-primary" disabled={!title.trim()} style={{ padding: '6px 12px' }}>
              添加
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

const s: Record<string, React.CSSProperties> = {
  content: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0,
  },
  header: {
    padding: '8px 12px 6px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  title: { fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' },
  stats: { display: 'flex', gap: 5 },
  list: {
    flex: 1, overflowY: 'auto', padding: '0 10px 6px',
  },
  cardGroup: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--hairline)',
    overflow: 'hidden',
    marginBottom: 4,
  },
  centered: { textAlign: 'center' as const, color: 'var(--text-secondary)', padding: 22, fontSize: 'var(--text-md)' },
  empty: {
    textAlign: 'center' as const, padding: '22px 14px',
    animation: 'fadeIn 0.3s ease',
  },
  emptyIcon: { fontSize: 'var(--text-2xl)', marginBottom: 6 },
  emptyTitle: { fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' },
  emptyDesc: { fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: 4 },
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
