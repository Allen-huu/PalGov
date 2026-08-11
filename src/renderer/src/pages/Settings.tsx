/**
 * 设置页
 */
import React from 'react'
import { PetSkin, Settings } from '@shared/types'

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = React.useState<Settings | null>(null)

  React.useEffect(() => {
    window.pet.settings.get().then(setSettings)
  }, [])

  if (!settings) return <div style={{ padding: 20 }}>加载中...</div>

  const update = async (patch: Partial<Settings>) => {
    const next = await window.pet.settings.set(patch)
    setSettings(next)
  }

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

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 24 }}>
    <h3 style={{ fontSize: 13, color: '#888', marginBottom: 10, fontWeight: 500 }}>{title}</h3>
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
