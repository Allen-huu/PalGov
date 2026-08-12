/**
 * 任务面板页（独立窗口）
 */
import React from 'react'
import { useTask } from '../hooks/useTask'
import { TaskItem } from '../components/TaskItem'
import { formatDateChinese, getTodayDate } from '../utils/date'
import { useRouter } from '../router'

export const TaskPanelPage: React.FC = () => {
  const { tasks, loading, create, toggleDone, remove } = useTask()
  const [title, setTitle] = React.useState('')
  const [note, setNote] = React.useState('')
  const [dueTime, setDueTime] = React.useState('')
  const [expanded, setExpanded] = React.useState(false)
  const { navigate } = useRouter()

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
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--panel-bg)',
        backdropFilter: 'blur(20px)',
        borderRadius: 12,
        border: '1px solid var(--panel-border)',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* 头部 */}
      <div
        style={{
          padding: '14px 16px 10px',
          borderBottom: '1px solid var(--panel-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
          <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>今日任务</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            {formatDateChinese()}
          </div>
          </div>
          <div style={featureTabs}>
            <button onClick={() => navigate('/task-panel')} style={{ ...featureTab, ...activeTab }}>🗒 笔记</button>
            <button onClick={() => navigate('/quiz')} style={featureTab}>✦ 答题</button>
            <button onClick={() => navigate('/wrong-book')} style={featureTab}>↺ 错题本</button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          待办 <span style={{ color: 'var(--accent)' }}>{pending.length}</span> / 已完成{' '}
          <span style={{ color: 'var(--success)' }}>{done.length}</span>
        </div>
      </div>

      {/* 任务列表 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
            加载中...
          </div>
        ) : tasks.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              padding: '40px 20px',
              fontSize: 13
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>🐾</div>
            今日暂无任务，开始添加吧～
          </div>
        ) : (
          <>
            {pending.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onToggle={() => toggleDone(t.id)}
                onDelete={() => remove(t.id)}
              />
            ))}
            {done.length > 0 && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  margin: '12px 4px 6px',
                  borderTop: '1px dashed var(--panel-border)',
                  paddingTop: 8
                }}
              >
                已完成
              </div>
            )}
            {done.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onToggle={() => toggleDone(t.id)}
                onDelete={() => remove(t.id)}
              />
            ))}
          </>
        )}
      </div>

      {/* 底部添加区 */}
      <div style={{ borderTop: '1px solid var(--panel-border)', padding: 10 }}>
        {expanded && (
          <div style={{ marginBottom: 8 }}>
            <input
              placeholder="备注（可选）"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={inputStyle}
            />
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              style={{ ...inputStyle, marginTop: 6, colorScheme: 'dark' }}
            />
          </div>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            placeholder="添加新任务..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            style={{ ...inputStyle, flex: 1 }}
            autoFocus
          />
          <button
            onClick={() => setExpanded(!expanded)}
            title="更多选项"
            style={btnGhost}
          >
            ⚙
          </button>
          <button onClick={handleAdd} style={btnPrimary} disabled={!title.trim()}>
            添加
          </button>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid var(--panel-border)',
  borderRadius: 6,
  padding: '8px 10px',
  color: 'var(--text-primary)',
  fontSize: 13,
  width: '100%'
}

const btnPrimary: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#1a1a1a',
  border: 'none',
  borderRadius: 6,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer'
}

const btnGhost: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--panel-border)',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 13,
  cursor: 'pointer'
}

const featureTabs: React.CSSProperties = { display: 'flex', gap: 4, padding: 3, background: 'rgba(255,255,255,.08)', borderRadius: 10 }
const featureTab: React.CSSProperties = { background: 'transparent', color: 'var(--text-secondary)', borderRadius: 7, padding: '6px 7px', fontSize: 11, whiteSpace: 'nowrap' }
const activeTab: React.CSSProperties = { background: 'rgba(255,184,108,.2)', color: 'var(--accent)', fontWeight: 600 }
