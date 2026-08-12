/**
 * 宠物页（透明窗口）— 水豚噜噜唯一角色
 * 操作：单击切换面板，双击快速添加，拖拽移动
 * 右键菜单已移除，全部使用快捷键控制
 */
import React from 'react'
import { PetSprite, PetState } from '../components/PetSprite'
import { useDrag } from '../hooks/useDrag'
import { Settings } from '@shared/types'

export const PetPage: React.FC = () => {
  const [settings, setSettings] = React.useState<Settings | null>(null)
  const [state, setState] = React.useState<PetState>('idle')
  const { onMouseDown, hasDragged } = useDrag()

  React.useEffect(() => {
    window.pet.settings.get().then(setSettings)

    const unsubscribe = window.pet.task.onNotify(() => {
      setState('alert')
      setTimeout(() => setState('idle'), 5000)
    })
    return unsubscribe
  }, [])

  const handleClick = () => {
    if (hasDragged()) return
    window.pet.window.togglePanel()
  }

  const handleDoubleClick = () => {
    if (hasDragged()) return
    window.pet.window.quickAdd()
  }

  if (!settings) return null

  return (
    <div
      style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <PetSprite state={state} onMouseDown={onMouseDown} />
    </div>
  )
}