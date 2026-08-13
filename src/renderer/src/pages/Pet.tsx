/**
 * 宠物页（透明窗口）— 水豚噜噜唯一角色
 * 操作：双击切换面板，拖拽移动
 * 右键菜单已移除，全部使用快捷键控制
 */
import React from 'react'
import { PetSprite, PetState } from '../components/PetSprite'
import { useDrag } from '../hooks/useDrag'
import { Settings } from '@shared/types'

export const PetPage: React.FC = () => {
  const [settings, setSettings] = React.useState<Settings | null>(null)
  const [state, setState] = React.useState<PetState>('idle')
  const [speech, setSpeech] = React.useState<string | null>(null)
  const { onMouseDown, hasDragged, isDragging } = useDrag()
  const animTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const speechTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  /** 播放一次性动画，结束后回到 idle */
  const playOnce = (s: PetState, durationMs: number) => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current)
    setState(s)
    animTimerRef.current = setTimeout(() => setState('idle'), durationMs)
  }

  /** 显示对话气泡，自动消失 */
  const showSpeech = (msg: string) => {
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current)
    setSpeech(msg)
    speechTimerRef.current = setTimeout(() => setSpeech(null), 4000)
  }

  React.useEffect(() => {
    window.pet.settings.get().then(setSettings)

    const unsubNotify = window.pet.task.onNotify(() => {
      setState('alert')
      setTimeout(() => setState('idle'), 5000)
    })

    const unsubQuiz = window.pet.anim.onQuizEvent((event: string) => {
      if (event === 'correct') playOnce('correct', 2500)
      else if (event === 'wrong') playOnce('wrong', 2500)
    })

    // 监听喝水提醒
    const unsubSpeech = window.pet.anim.onSpeech((msg: string) => {
      showSpeech(msg)
    })

    return () => { unsubNotify(); unsubQuiz(); unsubSpeech() }
  }, [])

  // 拖拽状态同步
  React.useEffect(() => {
    if (isDragging) {
      setState('dragging')
    } else if (state === 'dragging') {
      setState('idle')
    }
  }, [isDragging])

  const handleDoubleClick = () => {
    if (hasDragged()) return
    window.pet.window.togglePanel()
  }

  if (!settings) return null

  return (
    <div
      style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}
      onDoubleClick={handleDoubleClick}
    >
      {speech && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 4,
          padding: '6px 12px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontSize: 11,
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          zIndex: 10,
          animation: 'fadeIn 0.3s ease',
          maxWidth: 200,
          textAlign: 'center',
        }}>
          {speech}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid rgba(255,255,255,0.92)',
          }} />
        </div>
      )}
      <PetSprite state={state} onMouseDown={onMouseDown} />
    </div>
  )
}