/**
 * 任务列表项组件 — Apple 风格
 */
import React from 'react'
import { Task } from '@shared/types'
import { formatTime } from '../utils/date'

interface Props {
  task: Task
  onToggle: () => void
  onDelete: () => void
}

export const TaskItem: React.FC<Props> = ({ task, onToggle, onDelete }) => {
  const [hover, setHover] = React.useState(false)

  return (
    <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 6,
      padding: '6px 8px',
      borderRadius: 'var(--radius-md)',
      background: hover ? 'rgba(0,0,0,0.02)' : 'transparent',
      marginBottom: 1,
      transition: 'background 0.15s ease',
      animation: 'fadeIn 0.2s ease',
    }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* 自定义圆形 checkbox */}
      <button
        onClick={onToggle}
        style={{
          width: 20, height: 20, borderRadius: '50%',
          border: task.done ? 'none' : '2px solid rgba(0,0,0,0.18)',
          background: task.done ? 'var(--success)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 2,
          transition: 'all 0.2s ease',
        }}
      >
        {task.done && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 500,
          textDecoration: task.done ? 'line-through' : 'none',
          color: task.done ? 'var(--text-tertiary)' : 'var(--text-primary)',
          wordBreak: 'break-word', lineHeight: 1.4,
        }}>
          {task.title}
        </div>
        {task.note && (
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3, lineHeight: 1.4 }}>
            {task.note}
          </div>
        )}
        {task.dueAt && (
          <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>{formatTime(task.dueAt)}</span>
          </div>
        )}
      </div>

      {hover && (
        <button
          onClick={onDelete}
          title="删除"
          style={{
            background: 'transparent', color: 'var(--text-tertiary)',
            fontSize: 15, padding: '0 2px', flexShrink: 0, marginTop: 1,
            borderRadius: 4, width: 22, height: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 4h8M5.5 4V3a1 1 0 011-1h1a1 1 0 011 1v1M5.5 6.5v4M8.5 6.5v4M4 4l.8 7.2a1 1 0 001 .8h2.4a1 1 0 001-.8L10 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}