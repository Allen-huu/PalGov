/**
 * B站动态页：B站粉主题（作用域内覆盖 --accent），显示已关注 UP 主的动态流与轮询状态
 */
import React from 'react'
import { BiliDynamic, BiliUp } from '@shared/types'
import { PanelSidebar } from '../components/PanelSidebar'
import { useRouter } from '../router'

/** B站品牌色（覆盖页面作用域内的 --accent） */
const BILI_PINK = '#FB7299'
const BILI_PINK_LIGHT = '#FF8CB4'

function formatTime(ts: number): string {
  const diff = Date.now() - ts * 1000
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  const d = new Date(ts * 1000)
  return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 日期分组标签：今天 / 昨天 / 前天 / M月D日 */
function dateLabel(ts: number): string {
  const t = ts * 1000
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (t >= startOfToday) return '今天'
  if (t >= startOfToday - 86_400_000) return '昨天'
  if (t >= startOfToday - 2 * 86_400_000) return '前天'
  const d = new Date(t)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 小电视图标（B站 logo 简化版） */
const TvIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" />
    <rect x="10" y="9.5" width="4" height="5" rx="1" fill={BILI_PINK} />
    <path d="M7 3.5 L10.5 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M17 3.5 L13.5 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
)

interface PollStatus {
  lastError: string | null
  lastPollAt: number | null
  nextPollAt: number | null
}

export const BilibiliPage: React.FC = () => {
  const { path } = useRouter()
  const [dynamics, setDynamics] = React.useState<BiliDynamic[]>([])
  const [ups, setUps] = React.useState<BiliUp[]>([])
  const [loading, setLoading] = React.useState(true)
  const [input, setInput] = React.useState('')
  const [adding, setAdding] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [refreshing, setRefreshing] = React.useState(false)
  const [status, setStatus] = React.useState<PollStatus | null>(null)
  /** 每秒跳动一次，驱动相对时间刷新 */
  const [, setTick] = React.useState(0)

  const refresh = React.useCallback(() => {
    void window.pet.bili.listDynamics().then(setDynamics)
    void window.pet.bili.listUps().then(setUps)
    void window.pet.bili.status().then(setStatus)
  }, [])

  React.useEffect(() => {
    refresh()
    setLoading(false)
    const unsub = window.pet.bili.onUpdate(() => refresh())
    const tickTimer = window.setInterval(() => setTick((t) => t + 1), 1000)
    const statusTimer = window.setInterval(() => {
      void window.pet.bili.status().then(setStatus)
    }, 2000)
    return () => {
      unsub()
      window.clearInterval(tickTimer)
      window.clearInterval(statusTimer)
    }
  }, [refresh])

  const handleAdd = async () => {
    if (!input.trim() || adding) return
    setAdding(true)
    setMessage('正在添加…')
    try {
      const result = await window.pet.bili.addUp(input.trim())
      setMessage(result.message)
      if (result.ok) {
        setInput('')
        refresh()
      }
    } catch {
      setMessage('添加失败，请重试')
    }
    setAdding(false)
    window.setTimeout(() => setMessage(''), 2500)
  }

  const handleRemove = async (mid: number) => {
    await window.pet.bili.removeUp(mid)
    refresh()
  }

  const handleRefreshNow = async () => {
    setRefreshing(true)
    try {
      await window.pet.bili.refreshNow()
      refresh()
      setMessage('已刷新')
    } catch {
      setMessage('刷新失败')
    }
    setRefreshing(false)
    window.setTimeout(() => setMessage(''), 2000)
  }

  // 按日期分组（列表已按时间倒序）
  const groups: Array<{ label: string; items: BiliDynamic[] }> = []
  for (const d of dynamics) {
    const label = dateLabel(d.pubTs)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(d)
    else groups.push({ label, items: [d] })
  }

  // 轮询状态文案
  let pollText = '正在启动轮询…'
  if (status) {
    const parts: string[] = []
    if (status.lastPollAt) {
      const sec = Math.floor((Date.now() - status.lastPollAt) / 1000)
      parts.push(sec < 3 ? '刚刚检查过' : `上次检查 ${sec < 60 ? `${sec} 秒前` : `${Math.floor(sec / 60)} 分钟前`}`)
    }
    if (status.nextPollAt) {
      const sec = Math.max(0, Math.ceil((status.nextPollAt - Date.now()) / 1000))
      parts.push(status.lastPollAt ? `${sec} 秒后再查` : `首次检查即将开始`)
    }
    pollText = parts.join(' · ') || '轮询未运行（检查设置开关）'
  }

  return (
    <main className="panel-root" style={{ '--accent': BILI_PINK } as React.CSSProperties}>
      <PanelSidebar />
      <div style={s.content}>
        {/* B站头部：品牌渐变条 */}
        <div style={s.header}>
          <span style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 5 }}>
            <TvIcon size={13} />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, letterSpacing: '0.02em' }}>哔哩哔哩动态</span>
          </span>
          <span style={s.pollText}>{pollText}</span>
        </div>

        {/* 添加 UP 主 */}
        <div style={s.addRow}>
          <input
            className="input-apple"
            placeholder="UP 主空间链接或 UID…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            style={{ flex: 1, minWidth: 0 }}
          />
          <button onClick={handleAdd} disabled={adding || !input.trim()} className="btn-primary" style={{ ...s.pinkBtn, flexShrink: 0 }}>
            {adding ? '…' : '关注'}
          </button>
          <button className="btn-ghost btn-sm" onClick={handleRefreshNow} disabled={refreshing} style={{ flexShrink: 0 }} title="深度刷新：重新拉取最近 3 天动态">
            {refreshing ? '…' : '↻'}
          </button>
        </div>
        {message && <div style={s.message}>{message}</div>}
        {status?.lastError && (
          <div style={s.errorBanner} title={status.lastError}>
            ⚠️ 拉取动态失败：{status.lastError.length > 60 ? status.lastError.slice(0, 60) + '…' : status.lastError}
          </div>
        )}

        {/* 已关注列表 */}
        {ups.length > 0 && (
          <div style={s.upsRow}>
            {ups.map((up) => (
              <span key={up.mid} style={s.upChip} title={`移除「${up.name}」`}>
                <a
                  href={`https://space.bilibili.com/${up.mid}`}
                  onClick={(e) => { e.preventDefault(); window.open(`https://space.bilibili.com/${up.mid}`) }}
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  {up.name}
                </a>
                <span style={s.upRemove} onClick={() => handleRemove(up.mid)}>✕</span>
              </span>
            ))}
          </div>
        )}

        {/* 动态流 */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {loading ? (
            <div style={s.centered}>加载中...</div>
          ) : dynamics.length === 0 ? (
            <div style={s.empty}>
              <div style={{ fontSize: 'var(--text-2xl)', marginBottom: 6 }}>📺</div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>还没有动态</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: 4 }}>
                在上方输入 UP 主空间链接或 UID，关注后自动展示最近 3 天动态
              </div>
            </div>
          ) : (
            groups.map((g) => (
              <React.Fragment key={g.label}>
                <div style={s.dateHeader}>
                  {g.label}
                  <span style={s.dateCount}>{g.items.length}</span>
                </div>
                {g.items.map((d) => (
                  <div
                    key={d.id}
                    style={s.card}
                    onClick={() => window.open(d.url)}
                    title="点击在浏览器打开"
                  >
                    <div style={s.cardHead}>
                      <span style={s.upName}>{d.upName}</span>
                      <span style={s.time}>{formatTime(d.pubTs)}</span>
                    </div>
                    <div style={s.cardText}>{d.text}</div>
                  </div>
                ))}
              </React.Fragment>
            ))
          )}
        </div>
      </div>
    </main>
  )
}

const s: Record<string, React.CSSProperties> = {
  content: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 8px 6px', minWidth: 0 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, margin: '0 -8px 6px', padding: '7px 10px', background: `linear-gradient(120deg, ${BILI_PINK_LIGHT} 0%, ${BILI_PINK} 55%, #F25D8E 100%)` },
  pollText: { fontSize: 'var(--text-2xs)', color: 'rgba(255,255,255,0.92)', fontWeight: 500, textAlign: 'right' as const, lineHeight: 1.3 },
  addRow: { display: 'flex', gap: 4, marginBottom: 5 },
  pinkBtn: { background: `linear-gradient(135deg, ${BILI_PINK_LIGHT}, ${BILI_PINK})`, boxShadow: '0 2px 8px rgba(251, 114, 153, 0.35)' },
  message: { fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 4, paddingLeft: 2 },
  errorBanner: { fontSize: 'var(--text-xs)', lineHeight: 1.4, color: '#b45309', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', marginBottom: 5, wordBreak: 'break-all' },
  upsRow: { display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 },
  upChip: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--accent)', background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-full)', padding: '2px 8px', cursor: 'pointer' },
  upRemove: { color: 'rgba(251, 114, 153, 0.55)', fontSize: 'var(--text-2xs)', padding: '0 2px' },
  centered: { textAlign: 'center' as const, color: 'var(--text-secondary)', padding: 22, fontSize: 'var(--text-md)' },
  empty: { textAlign: 'center' as const, padding: '22px 14px', animation: 'fadeIn 0.3s ease' },
  dateHeader: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent)', margin: '8px 2px 3px', letterSpacing: '0.03em' },
  dateCount: { fontSize: 'var(--text-2xs)', fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-bg)', borderRadius: 'var(--radius-full)', padding: '0 6px', lineHeight: '14px' },
  card: { padding: '7px 9px', marginBottom: 4, borderRadius: 'var(--radius-md)', background: 'var(--surface)', border: '1px solid var(--hairline)', borderLeft: '3px solid var(--accent)', cursor: 'pointer', transition: 'all 0.12s ease' },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  upName: { fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent)' },
  time: { fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' },
  cardText: { fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.4, wordBreak: 'break-word' },
}
