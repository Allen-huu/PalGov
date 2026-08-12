/**
 * 宠物精灵组件：根据状态显示图片帧序列动画
 * 优先从 assets/pets/ 目录加载 PNG 帧动画，不存在则回退到内联 SVG
 */
import React from 'react'
import { PetSkin } from '@shared/types'
import { resolveAsset, preloadSkin } from '../utils/asset'

export type PetState = 'idle' | 'happy' | 'alert'

interface Props {
  skin: PetSkin
  state: PetState
  onMouseDown?: (e: React.MouseEvent) => void
  /** 动画状态结束时回调（仅 happy/alert 会触发） */
  onStateEnd?: () => void
}

/** 各状态的帧数和帧间隔 */
const STATE_CONFIG: Record<PetState, { frames: number; interval: number; loop: boolean }> = {
  idle: { frames: 4, interval: 400, loop: true },
  happy: { frames: 6, interval: 150, loop: false },
  alert: { frames: 4, interval: 200, loop: true }
}

const HAPPY_CYCLES = 3
const ALERT_HOLD_MS = 5000

export const PetSprite: React.FC<Props> = ({ skin, state, onMouseDown, onStateEnd }) => {
  const [frame, setFrame] = React.useState(0)
  const [imageUrls, setImageUrls] = React.useState<(string | null)[]>([])
  const frameCount = STATE_CONFIG[state].frames

  // 预加载皮肤所有资源
  React.useEffect(() => {
    preloadSkin(skin)
  }, [skin])

  // 加载当前状态所有帧 URL
  React.useEffect(() => {
    let cancelled = false
    const config = STATE_CONFIG[state]
    const promises = Array.from({ length: config.frames }, (_, i) =>
      resolveAsset(skin, state, i)
    )
    Promise.all(promises).then((urls) => {
      if (!cancelled) setImageUrls(urls)
    })
    return () => {
      cancelled = true
    }
  }, [skin, state])

  // 帧动画循环
  React.useEffect(() => {
    const config = STATE_CONFIG[state]
    setFrame(0)

    if (state === 'happy') {
      const totalFrames = config.frames
      const totalDuration = config.interval * totalFrames * HAPPY_CYCLES
      const startTime = Date.now()

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const cyclePosition = Math.floor(elapsed / config.interval) % totalFrames
        setFrame(cyclePosition)

        if (elapsed >= totalDuration) {
          clearInterval(interval)
          onStateEnd?.()
        }
      }, config.interval)

      return () => clearInterval(interval)
    }

    if (state === 'alert') {
      const interval = setInterval(() => {
        setFrame((prev) => (prev + 1) % config.frames)
      }, config.interval)

      const holdTimer = setTimeout(() => {
        clearInterval(interval)
        onStateEnd?.()
      }, ALERT_HOLD_MS)

      return () => {
        clearInterval(interval)
        clearTimeout(holdTimer)
      }
    }

    // idle：永远循环
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % config.frames)
    }, config.interval)
    return () => clearInterval(interval)
  }, [state, skin])

  const hasImages = imageUrls.length > 0 && imageUrls[0] !== null
  const currentUrl = imageUrls[frame] ?? null

  const animationName =
    state === 'happy'
      ? 'bounce 0.6s ease-in-out infinite'
      : state === 'alert'
        ? 'wiggle 0.4s ease-in-out infinite'
        : 'breathe 3s ease-in-out infinite'

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        width: 140,
        height: 140,
        cursor: 'grab',
        animation: animationName,
        transformOrigin: 'center bottom'
      }}
    >
      {hasImages && currentUrl ? (
        <img
          key={`${skin}-${state}-${frame}`}
          src={currentUrl}
          alt={`${skin}-${state}-${frame}`}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          draggable={false}
        />
      ) : (
        <InlineFallback skin={skin} state={state} />
      )}
    </div>
  )
}

/** 内联 SVG 回退方案 */
const InlineFallback: React.FC<{ skin: PetSkin; state: PetState }> = ({ skin, state }) => {
  if (skin === 'cat') return <CatSvg state={state} />
  if (skin === 'dog') return <DogSvg state={state} />
  return <RobotSvg state={state} />
}

const CatSvg: React.FC<{ state: PetState }> = ({ state }) => (
  <svg viewBox="0 0 140 140" width="140" height="140">
    <ellipse cx="70" cy="95" rx="42" ry="32" fill="#ffb86c" />
    <circle cx="70" cy="65" r="36" fill="#ffd9a8" />
    <polygon points="40,40 50,20 60,45" fill="#ffb86c" />
    <polygon points="100,40 90,20 80,45" fill="#ffb86c" />
    <polygon points="45,38 50,28 55,42" fill="#ff9966" />
    <polygon points="95,38 90,28 85,42" fill="#ff9966" />
    {state === 'happy' ? (
      <>
        <path d="M55 60 Q60 55 65 60" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M75 60 Q80 55 85 60" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx="60" cy="62" r="3.5" fill="#333" />
        <circle cx="80" cy="62" r="3.5" fill="#333" />
        {state === 'alert' && (
          <>
            <circle cx="60" cy="62" r="6" fill="none" stroke="#ff5555" strokeWidth="1.5" />
            <circle cx="80" cy="62" r="6" fill="none" stroke="#ff5555" strokeWidth="1.5" />
          </>
        )}
      </>
    )}
    <path d="M68 72 L72 72 L70 75 Z" fill="#ff9966" />
    <path d="M70 75 Q66 80 62 78 M70 75 Q74 80 78 78" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <line x1="35" y1="75" x2="50" y2="75" stroke="#999" strokeWidth="1" />
    <line x1="35" y1="80" x2="50" y2="78" stroke="#999" strokeWidth="1" />
    <line x1="90" y1="75" x2="105" y2="75" stroke="#999" strokeWidth="1" />
    <line x1="90" y1="78" x2="105" y2="80" stroke="#999" strokeWidth="1" />
    <path d="M110 100 Q125 90 120 75" stroke="#ffb86c" strokeWidth="8" fill="none" strokeLinecap="round" />
  </svg>
)

const DogSvg: React.FC<{ state: PetState }> = ({ state }) => (
  <svg viewBox="0 0 140 140" width="140" height="140">
    <ellipse cx="70" cy="95" rx="42" ry="30" fill="#d4a574" />
    <circle cx="70" cy="65" r="34" fill="#e6b88a" />
    <ellipse cx="42" cy="55" rx="10" ry="18" fill="#b08856" transform="rotate(-20 42 55)" />
    <ellipse cx="98" cy="55" rx="10" ry="18" fill="#b08856" transform="rotate(20 98 55)" />
    {state === 'happy' ? (
      <>
        <path d="M55 62 Q60 57 65 62" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M75 62 Q80 57 85 62" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx="60" cy="62" r="3.5" fill="#333" />
        <circle cx="80" cy="62" r="3.5" fill="#333" />
      </>
    )}
    <ellipse cx="70" cy="75" rx="6" ry="4" fill="#333" />
    <path d="M70 79 L70 84 M70 84 Q66 88 62 86 M70 84 Q74 88 78 86" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M105 95 Q120 80 115 65" stroke="#d4a574" strokeWidth="7" fill="none" strokeLinecap="round" />
  </svg>
)

const RobotSvg: React.FC<{ state: PetState }> = ({ state }) => (
  <svg viewBox="0 0 140 140" width="140" height="140">
    <line x1="70" y1="20" x2="70" y2="35" stroke="#666" strokeWidth="3" />
    <circle cx="70" cy="18" r="4" fill={state === 'alert' ? '#ff5555' : '#50fa7b'} />
    <rect x="40" y="35" width="60" height="50" rx="8" fill="#9ca3af" />
    <rect x="45" y="40" width="50" height="40" rx="4" fill="#1f2937" />
    {state === 'happy' ? (
      <>
        <path d="M55 55 Q60 50 65 55" stroke="#50fa7b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M75 55 Q80 50 85 55" stroke="#50fa7b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx="60" cy="58" r="4" fill={state === 'alert' ? '#ff5555' : '#50fa7b'} />
        <circle cx="80" cy="58" r="4" fill={state === 'alert' ? '#ff5555' : '#50fa7b'} />
      </>
    )}
    <rect x="58" y="70" width="24" height="4" rx="2" fill="#50fa7b" />
    <rect x="45" y="90" width="50" height="35" rx="6" fill="#6b7280" />
    <circle cx="60" cy="107" r="3" fill="#ffb86c" />
    <circle cx="80" cy="107" r="3" fill="#50fa7b" />
  </svg>
)
