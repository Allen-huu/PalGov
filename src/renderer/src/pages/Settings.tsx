import React from 'react'
import { Settings } from '@shared/types'

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = React.useState<Settings | null>(null)
  const [key, setKey] = React.useState('')
  const [showKey, setShowKey] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [message, setMessage] = React.useState('')

  React.useEffect(() => { window.pet.settings.get().then((s: Settings) => { setSettings(s); setKey(s.aiApiKey ?? '') }) }, [])

  const update = async (patch: Partial<Settings>) => {
    const next = await window.pet.settings.set(patch)
    setSettings(next)
    setMessage('已保存')
    window.setTimeout(() => setMessage(''), 1500)
  }

  const saveKey = async () => { const next = await window.pet.ai.setKey(key); setSettings(next); setMessage('API Key 已保存') }
  const test = async () => { setTesting(true); setMessage('正在测试连接…'); const result = await window.pet.ai.testConnection(); setMessage(result.message); setTesting(false) }

  if (!settings) return <div className="settings-page" style={{ padding: 32, color: '#fff' }}>正在加载设置…</div>

  return <main className="settings-page" style={styles.page}>
    <header style={styles.header}><div><h1 style={styles.title}>设置中心</h1><p style={styles.subtitle}>配置噜噜的行为、提醒和大模型服务</p></div><span style={styles.status}>{message || '自动保存'}</span></header>

    <Section title="宠物显示">
      <Info text="当前角色" value="🐹 水豚噜噜" />
      <Row label={settings.petVisible ? '显示宠物' : '隐藏宠物'}><button style={styles.primary} onClick={() => { if (settings.petVisible) window.pet.window.hidePet(); update({ petVisible: !settings.petVisible }) }}>{settings.petVisible ? '隐藏宠物' : '显示宠物'}</button></Row>
      <Row label="窗口置顶"><Toggle checked={settings.alwaysOnTop} onChange={(v) => update({ alwaysOnTop: v })} /></Row>
    </Section>

    <Section title="任务提醒">
      <Row label="启用任务到点提醒"><Toggle checked={settings.enableNotify} onChange={(v) => update({ enableNotify: v })} /></Row>
      <Row label="播放提醒声音"><Toggle checked={settings.notifySound} onChange={(v) => update({ notifySound: v })} /></Row>
    </Section>

    <Section title="大模型设置">
      <Row label="启用 AI 助手"><Toggle checked={settings.aiEnabled} onChange={(v) => update({ aiEnabled: v })} /></Row>
      <Field label="服务商"><Select value={settings.aiProvider} onChange={(v) => update({ aiProvider: v as Settings['aiProvider'] })} options={{ deepseek: 'DeepSeek', 'openai-compatible': 'OpenAI 兼容接口' }} /></Field>
      <Field label="API 地址"><Input value={settings.aiBaseUrl} onChange={(v) => update({ aiBaseUrl: v })} placeholder="https://api.deepseek.com/v1" /></Field>
      <Field label="模型名称"><Input value={settings.aiModel} onChange={(v) => update({ aiModel: v })} placeholder="deepseek-chat" /></Field>
      <Field label="API Key"><div style={styles.inline}><Input type={showKey ? 'text' : 'password'} value={key} onChange={setKey} placeholder="输入 API Key" /><button style={styles.smallButton} onClick={() => setShowKey(!showKey)}>{showKey ? '隐藏' : '显示'}</button><button style={styles.primary} onClick={saveKey}>保存</button></div></Field>
      <Field label={`温度 ${settings.aiTemperature.toFixed(1)}`}><input type="range" min="0" max="1.5" step="0.1" value={settings.aiTemperature} onChange={(e) => update({ aiTemperature: Number(e.target.value) })} /></Field>
      <Row label="发送任务上下文给 AI"><Toggle checked={settings.aiSendTaskContext} onChange={(v) => update({ aiSendTaskContext: v })} /></Row>
      <div style={styles.inline}><button style={styles.primary} disabled={testing} onClick={test}>{testing ? '测试中…' : '测试连接'}</button><span style={styles.hint}>{settings.aiApiKey ? '已配置 API Key' : '尚未配置 API Key'}</span></div>
      <p style={styles.help}>API Key 仅保存在本机。Base URL 必须是 OpenAI Chat Completions 兼容接口的根地址。</p>
    </Section>

    <Section title="系统行为"><Row label="开机自动启动"><Toggle checked={settings.autoStart} onChange={(v) => update({ autoStart: v })} /></Row></Section>
  </main>
}

const styles: Record<string, React.CSSProperties> = { page: { minHeight: '100%', padding: '28px 32px 44px', background: 'linear-gradient(160deg,#fff8ef 0%,#fff1dc 100%)', color: '#57443a' }, header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }, title: { fontSize: 24, margin: 0, color: '#704f3b' }, subtitle: { color: '#a88a78', marginTop: 6 }, status: { color: '#6ca66d', fontSize: 12 }, inline: { display: 'flex', gap: 8, alignItems: 'center', width: '100%' }, smallButton: { padding: '9px 12px', borderRadius: 9, background: '#fff', color: '#806654', border: '1px solid #ecd8c4' }, primary: { padding: '9px 16px', borderRadius: 9, background: '#f2aa63', color: '#fff', fontWeight: 600 }, hint: { color: '#a88a78', fontSize: 12 }, help: { color: '#a88a78', fontSize: 12, lineHeight: 1.6, marginTop: 4 } }

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => <section style={{ marginBottom: 26 }}><h2 style={{ color: '#ffb86c', fontSize: 14, marginBottom: 10 }}>{title}</h2><div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>{children}</div></section>
const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <div style={{ ...box, justifyContent: 'space-between' }}><span>{label}</span>{children}</div>
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label style={{ ...box, flexDirection: 'column', alignItems: 'stretch', gap: 7 }}><span style={{ color: '#aeb4c2', fontSize: 12 }}>{label}</span>{children}</label>
const Info: React.FC<{ text: string; value: string }> = ({ text, value }) => <div style={{ ...box, justifyContent: 'space-between' }}><span>{text}</span><strong>{value}</strong></div>
const box: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '12px 14px', background: 'rgba(255,255,255,.72)', border: '1px solid #f0dcc8', borderRadius: 14, boxShadow: '0 4px 12px rgba(152,101,57,.06)' }
const Input: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; type?: string }> = ({ value, onChange, placeholder, type = 'text' }) => <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ flex: 1, minWidth: 0, padding: '9px 11px', borderRadius: 7, border: '1px solid #444957', background: '#20222a', color: '#fff' }} />
const Select: React.FC<{ value: string; onChange: (v: string) => void; options: Record<string, string> }> = ({ value, onChange, options }) => <select value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: '8px 10px', borderRadius: 7, background: '#20222a', color: '#fff', border: '1px solid #444957' }}>{Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => <button onClick={() => onChange(!checked)} style={{ width: 40, height: 22, borderRadius: 12, border: 0, background: checked ? '#ffb86c' : '#555b6b', position: 'relative' }}><i style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff' }} /></button>
