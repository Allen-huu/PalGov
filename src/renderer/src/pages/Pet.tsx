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

  /** 显示宠物对话区，自动收起 */
  const showSpeech = (msg: string) => {
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current)
    setSpeech(msg)
    speechTimerRef.current = setTimeout(() => setSpeech(null), 4000)
  }

  React.useEffect(() => {
    window.pet.settings.get().then(setSettings)

    const unsubNotify = window.pet.task.onNotify(() => {
      playOnce('alert', 5000)
      setTimeout(() => setState('idle'), 5000)
    })

    const unsubQuiz = window.pet.anim.onQuizEvent((event: string) => {
      if (event === 'correct') playOnce('correct', 2500)
      else if (event === 'wrong') playOnce('wrong', 2500)
      else if (event === 'taskCreated' || event === 'taskDone') playOnce('happy', 1400)
      else if (event === 'taskDeleted') playOnce('thinking', 1200)
    })

    // 监听统一的宠物对话
    const unsubDialogue = window.pet.anim.onDialogue((msg: string) => {
      showSpeech(msg)
      playOnce(msg.includes('喝水') || msg.includes('水') ? 'thirsty' : msg.includes('站') || msg.includes('坐') ? 'stand' : 'alert', 2600)
    })

    return () => {
      unsubNotify(); unsubQuiz(); unsubDialogue()
      if (animTimerRef.current) clearTimeout(animTimerRef.current)
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current)
    }
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
      {speech && <div className="pet-dialogue" role="status" aria-live="polite">{speech}</div>}
      <PetSprite state={state} onMouseDown={onMouseDown} />
    </div>
  )
}
