/**
 * 宠物页（透明窗口）：渲染宠物精灵 + 右键菜单
 */
import React from 'react'
import { PetSprite, PetState } from '../components/PetSprite'
import { useDrag } from '../hooks/useDrag'
import { PetSkin, Settings } from '@shared/types'

export const PetPage: React.FC = () => {
  const [settings, setSettings] = React.useState<Settings | null>(null)
  const [state, setState] = React.useState<PetState>('idle')
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [menuPos, setMenuPos] = React.useState({ x: 8, y: 8 })
  const { onMouseDown, hasDragged } = useDrag()

  React.useEffect(() => {
    window.pet.settings.get().then(setSettings)

    // 监听到期提醒：切换为 alert 状态 5 秒
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    // 宠物窗口只有 160px，菜单不能使用屏幕坐标，否则会被窗口边界裁切。
    setMenuPos({ x: 8, y: 42 })
    setMenuOpen(true)
  }

  const closeMenu = () => setMenuOpen(false)

  if (!settings) return null

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <PetSprite
        skin={(settings.petSkin as PetSkin) || 'cat'}
        state={state}
        onMouseDown={onMouseDown}
      />

      {menuOpen && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={closeMenu}
          onAdd={() => {
            closeMenu()
            window.pet.window.showPanel()
          }}
          onSettings={() => {
            closeMenu()
            window.pet.window.showSettings()
          }}
          onQuit={() => {
            closeMenu()
            // 通过隐藏窗口模拟退出，实际退出由托盘菜单触发
            window.pet.window.hidePanel()
          }}
        />
      )}
    </div>
  )
}

/** 右键菜单 */
const ContextMenu: React.FC<{
  x: number
  y: number
  onClose: () => void
  onAdd: () => void
  onSettings: () => void
  onQuit: () => void
}> = ({ x, y, onClose, onAdd, onSettings, onQuit }) => {
  React.useEffect(() => {
    const h = () => onClose()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [onClose])

  const items = [
    { label: '📋 添加任务', onClick: onAdd },
    { label: '⚙️ 设置', onClick: onSettings },
    { type: 'separator' as const },
    { label: '🚪 退出', onClick: onQuit }
  ]

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: 144,
        maxHeight: 112,
        overflow: 'hidden',
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        borderRadius: 8,
        boxShadow: 'var(--shadow)',
        backdropFilter: 'blur(10px)',
        padding: 4,
        zIndex: 1000
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) =>
        item.type === 'separator' ? (
          <div
            key={i}
            style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }}
          />
        ) : (
          <div
            key={i}
            onClick={item.onClick}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {item.label}
          </div>
        )
      )}
    </div>
  )
}
