/**
 * 宠物精灵组件：水豚噜噜 — 唯一角色
 * 动画方案：CSS @keyframes 驱动基础动作（呼吸、跳跃、摇摆），
 * 后续复杂动画可通过 SVG 帧动画或 Lottie 扩展。
 */
import React from 'react'

export type PetState = 'idle' | 'happy' | 'alert'

interface Props {
  state: PetState
  onMouseDown?: (e: React.MouseEvent) => void
}

export const PetSprite: React.FC<Props> = ({ state, onMouseDown }) => {
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
        width: 110,
        height: 110,
        cursor: 'grab',
        animation: animationName,
        transformOrigin: 'center bottom',
      }}
    >
      <CapybaraSprite state={state} />
    </div>
  )
}

/** 水豚噜噜 SVG */
const CapybaraSprite: React.FC<{ state: PetState }> = ({ state }) => (
  <svg viewBox="0 0 110 110" width="110" height="110">
    {/* 身体 — 暖棕色圆润 */}
    <ellipse cx="55" cy="78" rx="38" ry="24" fill="#c4956a" />
    {/* 身体阴影 */}
    <ellipse cx="55" cy="82" rx="34" ry="16" fill="#b08058" opacity="0.5" />
    {/* 头部 */}
    <ellipse cx="55" cy="55" rx="28" ry="24" fill="#d4a87c" />
    {/* 耳朵 — 小圆耳 */}
    <ellipse cx="35" cy="40" rx="5" ry="4" fill="#b08058" />
    <ellipse cx="75" cy="40" rx="5" ry="4" fill="#b08058" />
    {/* 眼睛 */}
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
    {/* 鼻子 — 大鼻孔 */}
    <ellipse cx="52" cy="62" rx="3" ry="2" fill="#8b5e3c" />
    <ellipse cx="58" cy="62" rx="3" ry="2" fill="#8b5e3c" />
    {/* 嘴 — 微笑 */}
    <path
      d="M50 66 Q55 70 60 66"
      stroke="#3a2218"
      strokeWidth="1.2"
      fill="none"
      strokeLinecap="round"
    />
    {/* 绿色围巾/叶子标识 */}
    <path
      d="M38 58 Q40 56 42 58 Q44 60 42 62 Q40 64 38 62 Z"
      fill="#4caf50"
      opacity="0.8"
    />
    <path
      d="M42 58 Q44 55 46 58 Q48 60 46 62 Q44 64 42 62 Z"
      fill="#66bb6a"
      opacity="0.8"
    />
    {/* 前腿 */}
    <rect x="32" y="88" width="10" height="14" rx="5" fill="#b08058" />
    <rect x="68" y="88" width="10" height="14" rx="5" fill="#b08058" />
    {/* 后腿 */}
    <rect x="24" y="85" width="11" height="12" rx="5" fill="#a07050" />
    <rect x="75" y="85" width="11" height="12" rx="5" fill="#a07050" />
    {/* 尾巴 — 短短的小尾巴 */}
    <path
      d="M90 75 Q100 72 98 68"
      stroke="#b08058"
      strokeWidth="5"
      fill="none"
      strokeLinecap="round"
    />
    {/* 腮红 */}
    <circle cx="44" cy="60" r="3" fill="#e8a0a0" opacity="0.35" />
    <circle cx="66" cy="60" r="3" fill="#e8a0a0" opacity="0.35" />
  </svg>
)