/**
 * 任务列表项组件
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
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '10px 12px',
        borderRadius: 8,
        background: task.done ? 'rgba(80, 250, 123, 0.08)' : 'rgba(255,255,255,0.04)',
        marginBottom: 6,
        transition: 'background 0.2s'
      }}
    >
      <input
        type="checkbox"
        checked={task.done}
        onChange={onToggle}
        style={{ marginTop: 3, cursor: 'pointer', accentColor: 'var(--success)' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            textDecoration: task.done ? 'line-through' : 'none',
            color: task.done ? 'var(--text-secondary)' : 'var(--text-primary)',
            fontSize: 14,
            wordBreak: 'break-word'
          }}
        >
          {task.title}
        </div>
        {task.note && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            {task.note}
          </div>
        )}
        {task.dueAt && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--accent)',
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>⏰</span>
            <span>{formatTime(task.dueAt)}</span>
          </div>
        )}
      </div>
      <button
        onClick={onDelete}
        title="删除"
        style={{
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontSize: 16,
          padding: '0 4px'
        }}
      >
        ×
      </button>
    </div>
  )
}
