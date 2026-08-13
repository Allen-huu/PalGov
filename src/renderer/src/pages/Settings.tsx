import React from 'react'
import { Settings, ShortcutConfig, QuizShortcutConfig } from '@shared/types'

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = React.useState<Settings | null>(null)
  const [key, setKey] = React.useState('')
  const [showKey, setShowKey] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [message, setMessage] = React.useState('')
  /** 快捷键录制状态 */
  const [recording, setRecording] = React.useState<keyof ShortcutConfig | null>(null)
  /** 答题快捷键录制状态 */
  const [quizRecording, setQuizRecording] = React.useState<keyof QuizShortcutConfig | null>(null)

  React.useEffect(() => { window.pet.settings.get().then((s: Settings) => { setSettings(s); setKey(s.aiApiKey ?? '') }) }, [])

  const update = async (patch: Partial<Settings>) => {
    const next = await window.pet.settings.set(patch)
    setSettings(next)
    setMessage('已保存')
    window.setTimeout(() => setMessage(''), 1500)
  }

  const saveKey = async () => { const next = await window.pet.ai.setKey(key); setSettings(next); setMessage('API Key 已保存') }
  const test = async () => {
    setTesting(true)
    setMessage('正在测试连接…')
    try {
      const result = await window.pet.ai.testConnection()
      setMessage(result.message)
    } catch {
      setMessage('测试失败，请检查网络')
    }
    setTesting(false)
  }

  /** 开始录制快捷键 */
  const startRecording = (field: keyof ShortcutConfig) => {
    setRecording(field)
    setMessage('请按下快捷键组合…')
  }

  /** 监听键盘事件录制快捷键 */
  React.useEffect(() => {
    if (!recording) return
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const parts: string[] = []
      if (e.metaKey || e.ctrlKey) parts.push('CommandOrControl')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')
      const keyName = e.key.length === 1 ? e.key.toUpperCase() : e.key
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        parts.push(keyName)
      }
      if (parts.length >= 2) {
        const acc = parts.join('+')
        const newShortcuts = { ...settings!.shortcuts, [recording]: acc }
        update({ shortcuts: newShortcuts })
        setRecording(null)
        setMessage(`已设置: ${acc}`)
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [recording, settings])

  /** 监听键盘事件录制答题快捷键（单键，不含修饰键） */
  React.useEffect(() => {
    if (!quizRecording) return
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      // 忽略纯修饰键
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return
      const keyName = e.key.length === 1 ? e.key.toUpperCase() : e.key
      const newQuizShortcuts = { ...settings!.quizShortcuts, [quizRecording]: keyName }
      update({ quizShortcuts: newQuizShortcuts })
      setQuizRecording(null)
      setMessage(`已设置: ${keyName}`)
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [quizRecording, settings])

  if (!settings) return <div className="settings-page" style={{ padding: 32, color: 'var(--text-primary)', background: 'var(--glass-bg)', height: '100%' }}>正在加载设置…</div>

  return <main className="settings-page" style={s.page}>
    <header style={s.header}>
      <div>
        <h1 style={s.title}>设置中心</h1>
        <p style={s.subtitle}>配置噜噜的行为、提醒和大模型服务</p>
      </div>
      <span style={s.status}>{message || '自动保存'}</span>
    </header>

    <Section title="宠物显示">
      <Info text="当前角色" value="水豚噜噜" />
      <Row label={settings.petVisible ? '宠物已显示' : '宠物已隐藏'}>
        <button className="btn-primary" style={{ fontSize: 13, padding: '7px 14px' }}
          onClick={() => { if (settings.petVisible) { window.pet.window.hidePet() } else { window.pet.window.showPet() }; update({ petVisible: !settings.petVisible }) }}>
          {settings.petVisible ? '隐藏宠物' : '显示宠物'}
        </button>
      </Row>
      <Row label="窗口置顶"><Toggle checked={settings.alwaysOnTop} onChange={(v) => update({ alwaysOnTop: v })} /></Row>
    </Section>

    <Section title="全局快捷键">
      <ShortcutRow
        label="显示/隐藏面板"
        value={settings.shortcuts.togglePanel}
        recording={recording === 'togglePanel'}
        onRecord={() => { if (!recording) startRecording('togglePanel') }}
        onCancel={() => setRecording(null)}
      />
      <ShortcutRow
        label="显示/隐藏宠物"
        value={settings.shortcuts.togglePet}
        recording={recording === 'togglePet'}
        onRecord={() => { if (!recording) startRecording('togglePet') }}
        onCancel={() => setRecording(null)}
      />
      <ShortcutRow
        label="打开设置"
        value={settings.shortcuts.showSettings}
        recording={recording === 'showSettings'}
        onRecord={() => { if (!recording) startRecording('showSettings') }}
        onCancel={() => setRecording(null)}
      />
    </Section>

    <Section title="答题快捷键">
      <QuizShortcutRow
        label="选择选项 A"
        value={settings.quizShortcuts.selectA}
        recording={quizRecording === 'selectA'}
        onRecord={() => { if (!quizRecording) setQuizRecording('selectA') }}
        onCancel={() => setQuizRecording(null)}
      />
      <QuizShortcutRow
        label="选择选项 B"
        value={settings.quizShortcuts.selectB}
        recording={quizRecording === 'selectB'}
        onRecord={() => { if (!quizRecording) setQuizRecording('selectB') }}
        onCancel={() => setQuizRecording(null)}
      />
      <QuizShortcutRow
        label="选择选项 C"
        value={settings.quizShortcuts.selectC}
        recording={quizRecording === 'selectC'}
        onRecord={() => { if (!quizRecording) setQuizRecording('selectC') }}
        onCancel={() => setQuizRecording(null)}
      />
      <QuizShortcutRow
        label="选择选项 D"
        value={settings.quizShortcuts.selectD}
        recording={quizRecording === 'selectD'}
        onRecord={() => { if (!quizRecording) setQuizRecording('selectD') }}
        onCancel={() => setQuizRecording(null)}
      />
      <QuizShortcutRow
        label="下一题"
        value={settings.quizShortcuts.nextQuestion}
        recording={quizRecording === 'nextQuestion'}
        onRecord={() => { if (!quizRecording) setQuizRecording('nextQuestion') }}
        onCancel={() => setQuizRecording(null)}
      />
      <QuizShortcutRow
        label="上一题"
        value={settings.quizShortcuts.prevQuestion}
        recording={quizRecording === 'prevQuestion'}
        onRecord={() => { if (!quizRecording) setQuizRecording('prevQuestion') }}
        onCancel={() => setQuizRecording(null)}
      />
    </Section>

    <Section title="任务提醒">
      <Row label="启用任务到点提醒"><Toggle checked={settings.enableNotify} onChange={(v) => update({ enableNotify: v })} /></Row>
      <Row label="播放提醒声音"><Toggle checked={settings.notifySound} onChange={(v) => update({ notifySound: v })} /></Row>
    </Section>

    <Section title="大模型设置">
      <Row label="启用 AI 助手"><Toggle checked={settings.aiEnabled} onChange={(v) => update({ aiEnabled: v })} /></Row>
      <Field label="服务商">
        <select value={settings.aiProvider} onChange={(e) => update({ aiProvider: e.target.value as Settings['aiProvider'] })} className="input-apple">
          <option value="deepseek">DeepSeek</option>
          <option value="openai-compatible">OpenAI 兼容接口</option>
        </select>
      </Field>
      <Field label="API 地址">
        <input className="input-apple" value={settings.aiBaseUrl} onChange={(e) => update({ aiBaseUrl: e.target.value })} placeholder="https://api.deepseek.com/v1" />
      </Field>
      <Field label="模型名称">
        <input className="input-apple" value={settings.aiModel} onChange={(e) => update({ aiModel: e.target.value })} placeholder="deepseek-chat" />
      </Field>
      <Field label="API Key">
        <div style={s.inline}>
          <input className="input-apple" type={showKey ? 'text' : 'password'} value={key} onChange={(e) => setKey(e.target.value)} placeholder="输入 API Key" style={{ flex: 1, minWidth: 0 }} />
          <button className="btn-ghost" style={{ fontSize: 12, padding: '7px 12px' }} onClick={() => setShowKey(!showKey)}>{showKey ? '隐藏' : '显示'}</button>
          <button className="btn-primary" style={{ fontSize: 12, padding: '7px 14px' }} onClick={saveKey}>保存</button>
        </div>
      </Field>
      <Field label={`温度 ${settings.aiTemperature.toFixed(1)}`}>
        <input type="range" min="0" max="1.5" step="0.1" value={settings.aiTemperature}
          onChange={(e) => update({ aiTemperature: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--accent)' }} />
      </Field>
      <Row label="发送任务上下文给 AI"><Toggle checked={settings.aiSendTaskContext} onChange={(v) => update({ aiSendTaskContext: v })} /></Row>
      <div style={s.inline}>
        <button className="btn-primary" style={{ fontSize: 13 }} disabled={testing} onClick={test}>{testing ? '测试中…' : '测试连接'}</button>
        <span style={s.hint}>{settings.aiApiKey ? '已配置 API Key' : '尚未配置 API Key'}</span>
      </div>
      <p style={s.help}>API Key 仅保存在本机。Base URL 必须是 OpenAI Chat Completions 兼容接口的根地址。</p>
    </Section>

    <Section title="系统行为">
      <Row label="开机自动启动"><Toggle checked={settings.autoStart} onChange={(v) => update({ autoStart: v })} /></Row>
    </Section>

    <Section title="喝水提醒">
      <Field label="提醒间隔（分钟，0 为关闭）">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="range" min="0" max="120" step="5" value={settings.drinkReminderMinutes}
            onChange={(e) => update({ drinkReminderMinutes: Number(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--accent)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', minWidth: 40, textAlign: 'right' }}>
            {settings.drinkReminderMinutes === 0 ? '关闭' : `${settings.drinkReminderMinutes} 分钟`}
          </span>
        </div>
      </Field>
    </Section>

    <Section title="站立提醒">
      <Field label="提醒间隔（分钟，0 为关闭）">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="range" min="0" max="120" step="5" value={settings.standReminderMinutes}
            onChange={(e) => update({ standReminderMinutes: Number(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--accent)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', minWidth: 40, textAlign: 'right' }}>
            {settings.standReminderMinutes === 0 ? '关闭' : `${settings.standReminderMinutes} 分钟`}
          </span>
        </div>
      </Field>
    </Section>
  </main>
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100%', padding: '28px 32px 44px', background: '#f5f2eb', color: 'var(--text-primary)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  title: { fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' },
  subtitle: { color: 'var(--text-secondary)', marginTop: 4, fontSize: 14 },
  status: { color: 'var(--success)', fontSize: 12, fontWeight: 500 },
  inline: { display: 'flex', gap: 8, alignItems: 'center', width: '100%' },
  hint: { color: 'var(--text-tertiary)', fontSize: 12 },
  help: { color: 'var(--text-tertiary)', fontSize: 12, lineHeight: 1.6, marginTop: 4 },
  kbd: {
    display: 'inline-block', padding: '3px 8px',
    fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
    color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.04)',
    borderRadius: 5, border: '1px solid rgba(0,0,0,0.08)',
    letterSpacing: '0.02em',
  },
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section style={{ marginBottom: 24 }}>
    <h2 style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10, paddingLeft: 2 }}>{title}</h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.05)' }}>
      {React.Children.map(children, (child, i) => (
        <div style={{ borderBottom: i < React.Children.count(children) - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
          {child}
        </div>
      ))}
    </div>
  </section>
)

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
    <span style={{ fontSize: 14 }}>{label}</span>{children}
  </div>
)

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px', gap: 7 }}>
    <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>{label}</span>
    {children}
  </div>
)

const Info: React.FC<{ text: string; value: string }> = ({ text, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
    <span style={{ fontSize: 14 }}>{text}</span>
    <strong style={{ fontSize: 14, color: 'var(--accent)' }}>{value}</strong>
  </div>
)

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button className={`toggle-track ${checked ? 'on' : 'off'}`} onClick={() => onChange(!checked)}>
    <span className={`toggle-thumb ${checked ? 'on' : 'off'}`} />
  </button>
)

/** 快捷键展示/录制行 */
const ShortcutRow: React.FC<{
  label: string
  value: string
  recording: boolean
  onRecord: () => void
  onCancel: () => void
}> = ({ label, value, recording, onRecord, onCancel }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
    <span style={{ fontSize: 14 }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {recording ? (
        <>
          <kbd style={s.kbd} className="recording">按下组合键…</kbd>
          <button className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={onCancel}>取消</button>
        </>
      ) : (
        <>
          <kbd style={s.kbd}>{formatShortcut(value)}</kbd>
          <button className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={onRecord}>修改</button>
        </>
      )}
    </div>
  </div>
)

/** 格式化快捷键显示 */
function formatShortcut(acc: string): string {
  return acc
    .replace('CommandOrControl', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
    .replace('Shift', '⇧')
    .replace('Alt', '⌥')
    .replace(/\+/g, '')
}

/** 答题快捷键展示/录制行（单键） */
const QuizShortcutRow: React.FC<{
  label: string
  value: string
  recording: boolean
  onRecord: () => void
  onCancel: () => void
}> = ({ label, value, recording, onRecord, onCancel }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
    <span style={{ fontSize: 14 }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {recording ? (
        <>
          <kbd style={s.kbd} className="recording">按下按键…</kbd>
          <button className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={onCancel}>取消</button>
        </>
      ) : (
        <>
          <kbd style={s.kbd}>{formatQuizKey(value)}</kbd>
          <button className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={onRecord}>修改</button>
        </>
      )}
    </div>
  </div>
)

/** 格式化答题快捷键显示 */
function formatQuizKey(key: string): string {
  const map: Record<string, string> = {
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
    Enter: '↵', Space: '␣', Backspace: '⌫', Tab: '⇥', Escape: 'Esc'
  }
  return map[key] || key
}