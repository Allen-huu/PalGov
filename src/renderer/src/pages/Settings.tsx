import React from 'react'
import { PetSkin, Settings } from '@shared/types'

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = React.useState<Settings | null>(null)
  const [aiKeyInput, setAiKeyInput] = React.useState('')
  const [testing, setTesting] = React.useState(false)
  const [testResult, setTestResult] = React.useState<{ ok: boolean; message: string } | null>(null)
  const [showKey, setShowKey] = React.useState(false)
  const [savingKey, setSavingKey] = React.useState(false)

  React.useEffect(() => {
    window.pet.settings.get().then((s: Settings) => {
      setSettings(s)
      setAiKeyInput(s.aiApiKey ?? '')
    })
  }, [])

  const update = async (patch: Partial<Settings>) => {
    const next = await window.pet.settings.set(patch)
    setSettings(next)
  }

  const handleSaveApiKey = async () => {
    setSavingKey(true)
    try {
      await window.pet.ai.setKey(aiKeyInput)
      await window.pet.settings.get().then(setSettings)
    } finally {
      setSavingKey(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.pet.ai.testConnection()
      setTestResult(result)
    } finally {
      setTesting(false)
    }
  }

  if (!settings) return <div style={{ padding: 20 }}>加载中...</div>

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#1f2028',
        color: '#fff',
        padding: 24,
        overflowY: 'auto'
      }}
    >
      <h2 style={{ marginBottom: 20, fontSize: 18 }}>设置</h2>

      <Section title="宠物形象">
        <div style={{ display: 'flex', gap: 8 }}>
          {(['cat', 'dog', 'robot'] as PetSkin[]).map((skin) => (
            <button
              key={skin}
              onClick={() => update({ petSkin: skin })}
              style={{
                padding: '12px 20px',
                borderRadius: 8,
                border:
                  settings.petSkin === skin
                    ? '2px solid var(--accent)'
                    : '1px solid #444',
                background: settings.petSkin === skin ? 'rgba(255,184,108,0.15)' : '#2a2d36',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              {skin === 'cat' ? '🐱 猫咪' : skin === 'dog' ? '🐶 小狗' : '🤖 机器人'}
            </button>
          ))}
        </div>
      </Section>

      <Section title="显示">
        <Toggle
          label="窗口置顶"
          checked={settings.alwaysOnTop}
          onChange={(v) => update({ alwaysOnTop: v })}
        />
      </Section>

      <Section title="提醒">
        <Toggle
          label="启用任务提醒"
          checked={settings.enableNotify}
          onChange={(v) => update({ enableNotify: v })}
        />
        <Toggle
          label="提醒声音"
          checked={settings.notifySound}
          onChange={(v) => update({ notifySound: v })}
        />
      </Section>

      <Section title="AI 助手">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 14, color: '#aaa', minWidth: 80 }}>API Key</label>
            <div style={{ display: 'flex', flex: 1, gap: 4 }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={aiKeyInput}
                onChange={(e) => setAiKeyInput(e.target.value)}
                placeholder="输入你的 DeepSeek API Key"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #444',
                  background: '#2a2d36',
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #444',
                  background: '#2a2d36',
                  color: '#aaa',
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSaveApiKey}
              disabled={savingKey}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                background: savingKey ? '#555' : '#4a9eff',
                color: '#fff',
                cursor: savingKey ? 'not-allowed' : 'pointer',
                fontSize: 13
              }}
            >
              {savingKey ? '保存中...' : '保存 Key'}
            </button>
            <button
              onClick={handleTestConnection}
              disabled={testing || !aiKeyInput.trim()}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                background: testing ? '#555' : '#2a2d36',
                color: '#fff',
                cursor: testing || !aiKeyInput.trim() ? 'not-allowed' : 'pointer',
                fontSize: 13
              }}
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
          </div>

          {testResult && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: testResult.ok ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                color: testResult.ok ? '#4caf50' : '#f44336',
                fontSize: 13
              }}
            >
              {testResult.message}
            </div>
          )}

          <Toggle
            label="启用 AI 功能"
            checked={settings.aiEnabled}
            onChange={(v) => update({ aiEnabled: v })}
          />

          <p style={{ fontSize: 12, color: '#666', marginTop: 4, lineHeight: 1.5 }}>
            使用 DeepSeek Flash 模型，API Key 仅保存在本地，不会上传到任何服务器。
            申请地址：deepseek.com
          </p>
        </div>
      </Section>

      <Section title="系统">
        <Toggle
          label="开机自启"
          checked={settings.autoStart}
          onChange={(v) => update({ autoStart: v })}
        />
      </Section>
    </div>
  )
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children
}) => (
  <div style={{ marginBottom: 24 }}>
    <h3 style={{ fontSize: 13, color: '#888', marginBottom: 10, fontWeight: 500 }}>
      {title}
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
  </div>
)

const Toggle: React.FC<{
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}> = ({ label, checked, onChange }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 12px',
      background: '#2a2d36',
      borderRadius: 8
    }}
  >
    <span style={{ fontSize: 14 }}>{label}</span>
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: checked ? 'var(--accent)' : '#555',
        border: 'none',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s'
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s'
        }}
      />
    </button>
  </div>
)
