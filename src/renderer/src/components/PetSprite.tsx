/**
 * 宠物精灵组件：水豚噜噜 — 唯一角色
 * 动画方案：Sprite Sheet（竖排帧动画），支持动态生成 CSS keyframes
 * 精灵图放置在 src/renderer/public/assets/pets/capybara/sprites/ 目录
 * 动画配置见 manifest.json
 */
import React from 'react'

export type PetState = 'idle' | 'happy' | 'alert' | 'dragging' | 'correct' | 'wrong'

/** 单个动画配置 */
interface AnimConfig {
  file: string
  frames: number
  fps: number
  loop: boolean
}

/** 动画清单 */
interface AnimManifest {
  frameWidth: number
  frameHeight: number
  animations: Record<PetState, AnimConfig>
}

// 动画清单（与 public/assets/pets/capybara/manifest.json 同步）
const MANIFEST: AnimManifest = {
  frameWidth: 110,
  frameHeight: 110,
  animations: {
    idle:     { file: 'assets/pets/capybara/sprites/idle.png',     frames: 25, fps: 5,  loop: true },
    happy:    { file: 'assets/pets/capybara/sprites/happy.png',    frames: 25, fps: 12, loop: true },
    alert:    { file: 'assets/pets/capybara/sprites/alert.png',    frames: 25, fps: 10, loop: true },
    dragging: { file: 'assets/pets/capybara/sprites/dragging.png', frames: 25, fps: 12, loop: true },
    correct:  { file: 'assets/pets/capybara/sprites/correct.png',  frames: 25, fps: 12, loop: false },
    wrong:    { file: 'assets/pets/capybara/sprites/wrong.png',    frames: 25, fps: 12, loop: false },
  }
}

interface Props {
  state: PetState
  onMouseDown?: (e: React.MouseEvent) => void
}

/** 动态注入 CSS keyframes，返回 animation 属性值 */
function useSpriteAnimation(state: PetState): { animStyle: string | null; fallback: boolean } {
  const [fallback, setFallback] = React.useState(false)
  const cfg = MANIFEST.animations[state]
  const fh = MANIFEST.frameHeight
  const frames = cfg.frames
  const duration = frames / cfg.fps
  const animName = `pet-sprite-${state}`

  React.useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setFallback(false)
      injectKeyframes(animName, frames, fh)
    }
    img.onerror = () => setFallback(true)
    img.src = cfg.file
  }, [state])

  if (fallback) return { animStyle: null, fallback: true }

  return {
    animStyle: `${animName} ${duration}s steps(${frames - 1}) ${cfg.loop ? 'infinite' : '1'}`,
    fallback: false
  }
}

/** 注入 CSS @keyframes：from → to，配合 steps() 实现逐帧 */
function injectKeyframes(name: string, frames: number, frameHeight: number) {
  const styleId = `ks-${name}`
  if (document.getElementById(styleId)) return

  const lastOffset = (frames - 1) * frameHeight
  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `@keyframes ${name} { from { background-position: 0 0; } to { background-position: 0 -${lastOffset}px; } }`
  document.head.appendChild(style)
}

export const PetSprite: React.FC<Props> = ({ state, onMouseDown }) => {
  const cfg = MANIFEST.animations[state]
  const fw = MANIFEST.frameWidth
  const fh = MANIFEST.frameHeight
  const { animStyle, fallback } = useSpriteAnimation(state)

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        width: fw,
        height: fh,
        cursor: 'grab',
        transformOrigin: 'center bottom',
      }}
    >
      {fallback ? (
        <CapybaraSVG state={state} />
      ) : (
        <div
          style={{
            width: fw,
            height: fh,
            backgroundImage: `url(${cfg.file})`,
            backgroundSize: `${fw}px auto`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: '0 0',
            animation: animStyle ?? undefined,
          }}
        />
      )}
    </div>
  )
}

/** 水豚噜噜 SVG（精灵图缺失时的兜底） */
const CapybaraSVG: React.FC<{ state: PetState }> = ({ state }) => (
  <svg viewBox="0 0 110 110" width="110" height="110" style={{ display: 'block' }}>
    <ellipse cx="55" cy="78" rx="38" ry="24" fill="#c4956a" />
    <ellipse cx="55" cy="82" rx="34" ry="16" fill="#b08058" opacity="0.5" />
    <ellipse cx="55" cy="55" rx="28" ry="24" fill="#d4a87c" />
    <ellipse cx="35" cy="40" rx="5" ry="4" fill="#b08058" />
    <ellipse cx="75" cy="40" rx="5" ry="4" fill="#b08058" />
    {state === 'happy' ? (
      <>
        <path d="M46 52 Q50 48 54 52" stroke="#3a2218" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M56 52 Q60 48 64 52" stroke="#3a2218" strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx="50" cy="54" r="2.5" fill="#3a2218" />
        <circle cx="60" cy="54" r="2.5" fill="#3a2218" />
        {state === 'alert' && (
          <>
            <circle cx="50" cy="54" r="5" fill="none" stroke="#ff6b6b" strokeWidth="1.2" />
            <circle cx="60" cy="54" r="5" fill="none" stroke="#ff6b6b" strokeWidth="1.2" />
          </>
        )}
      </>
    )}
    <ellipse cx="52" cy="62" rx="3" ry="2" fill="#8b5e3c" />
    <ellipse cx="58" cy="62" rx="3" ry="2" fill="#8b5e3c" />
    <path d="M50 66 Q55 70 60 66" stroke="#3a2218" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M38 58 Q40 56 42 58 Q44 60 42 62 Q40 64 38 62 Z" fill="#4caf50" opacity="0.8" />
    <path d="M42 58 Q44 55 46 58 Q48 60 46 62 Q44 64 42 62 Z" fill="#66bb6a" opacity="0.8" />
    <rect x="32" y="88" width="10" height="14" rx="5" fill="#b08058" />
    <rect x="68" y="88" width="10" height="14" rx="5" fill="#b08058" />
    <rect x="24" y="85" width="11" height="12" rx="5" fill="#a07050" />
    <rect x="75" y="85" width="11" height="12" rx="5" fill="#a07050" />
    <path d="M90 75 Q100 72 98 68" stroke="#b08058" strokeWidth="5" fill="none" strokeLinecap="round" />
    <circle cx="44" cy="60" r="3" fill="#e8a0a0" opacity="0.35" />
    <circle cx="66" cy="60" r="3" fill="#e8a0a0" opacity="0.35" />
  </svg>
)