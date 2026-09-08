import React from 'react'
import { Settings, ShortcutConfig, QuizShortcutConfig, BiliUp, MySqlConfig, MySqlStatus, QuestionBankInfo } from '@shared/types'

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
  /** B站：关注输入、反馈、UP主列表、Cookie */
  const [biliInput, setBiliInput] = React.useState('')
  const [biliAdding, setBiliAdding] = React.useState(false)
  const [biliMsg, setBiliMsg] = React.useState('')
  const [biliUps, setBiliUps] = React.useState<BiliUp[]>([])
  const [biliCookie, setBiliCookie] = React.useState('')
  const [dbStatus, setDbStatus] = React.useState<MySqlStatus | null>(null)
  const [dbConfig, setDbConfig] = React.useState<MySqlConfig>({ host: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'palgo', ssl: false })
  const [dbMessage, setDbMessage] = React.useState('')
  const [banks, setBanks] = React.useState<QuestionBankInfo[]>([])
  const [bankMessage, setBankMessage] = React.useState('')
  const [editingBank, setEditingBank] = React.useState<string | null>(null)
  const [editingBankName, setEditingBankName] = React.useState('')

  React.useEffect(() => { window.pet.settings.get().then((s: Settings) => { setSettings(s); setKey(s.aiApiKey ?? ''); setBiliCookie(s.biliCookie ?? '') }) }, [])

  const refreshBiliUps = React.useCallback(() => {
    void window.pet.bili.listUps().then(setBiliUps)
  }, [])
  React.useEffect(() => { refreshBiliUps() }, [refreshBiliUps])
  React.useEffect(() => {
    void window.pet.database.status().then(setDbStatus)
    void window.pet.database.config().then((config) => { if (config) setDbConfig((prev) => ({ ...prev, ...config })) })
    void window.pet.quiz.listBanks().then(setBanks)
  }, [])

  const update = async (patch: Partial<Settings>) => {
    const next = await window.pet.settings.set(patch)
    setSettings(next)
    setMessage('已保存')
    window.setTimeout(() => setMessage(''), 1500)
  }

  const saveKey = async () => { const next = await window.pet.ai.setKey(key); setSettings(next); setMessage('API Key 已保存') }

  /** 添加 B 站 UP 主 */
  const handleAddBiliUp = async () => {
    if (!biliInput.trim() || biliAdding) return
    setBiliAdding(true)
    setBiliMsg('正在添加…')
    try {
      const result = await window.pet.bili.addUp(biliInput.trim())
      setBiliMsg(result.message)
      if (result.ok) {
        setBiliInput('')
        refreshBiliUps()
      }
    } catch {
      setBiliMsg('添加失败，请重试')
    }
    setBiliAdding(false)
  }

  /** 移除 B 站 UP 主 */
  const handleRemoveBiliUp = async (mid: number) => {
    await window.pet.bili.removeUp(mid)
    refreshBiliUps()
  }

  /** 保存 B 站 Cookie */
  const saveBiliCookie = async () => {
    const next = await window.pet.settings.set({ biliCookie: biliCookie.trim() })
    setSettings(next)
    setMessage('B站 Cookie 已保存')
    window.setTimeout(() => setMessage(''), 1500)
  }
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

  const bindDatabase = async () => {
    setDbMessage('正在连接…')
    try {
      const result = await window.pet.database.bind(dbConfig)
      setDbMessage(result.message)
      if (result.ok) setDbStatus(await window.pet.database.status())
    } catch (error) {
      setDbMessage(error instanceof Error ? error.message : 'MySQL 连接失败')
    }
  }

  const unbindDatabase = async () => {
    await window.pet.database.unbind()
    setDbStatus(await window.pet.database.status())
    setDbMessage('已解除绑定，应用将使用本地回退存储')
  }

  const importBank = async () => {
    try {
      const info = await window.pet.quiz.importBank()
      if (info) { setBanks((prev) => [...prev.filter((item) => item.fileName !== info.fileName), info]); setBankMessage(`已导入「${info.name}」`) }
    } catch (error) { setBankMessage(error instanceof Error ? error.message : '题库导入失败') }
  }

  const renameBank = async (bank: QuestionBankInfo) => {
    const name = editingBankName.trim()
    if (!name) return
    try {
      const updated = await window.pet.quiz.renameBank(bank.fileName, name)
      if (updated) {
        setBanks((prev) => prev.map((item) => item.fileName === bank.fileName ? updated : item))
        setEditingBank(null)
        setBankMessage('题库名称已更新')
      }
    } catch (error) { setBankMessage(error instanceof Error ? error.message : '题库重命名失败') }
  }

  const deleteBank = async (bank: QuestionBankInfo) => {
    if (!window.confirm(`确定删除「${bank.name}」吗？题库、答题进度和错题记录都会被删除。`)) return
    try {
      const deleted = await window.pet.quiz.deleteBank(bank.fileName)
      if (deleted) { setBanks((prev) => prev.filter((item) => item.fileName !== bank.fileName)); setBankMessage(`已删除「${bank.name}」`) }
    } catch (error) { setBankMessage(error instanceof Error ? error.message : '题库删除失败') }
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
      // 不能在只按 Ctrl/Command + Shift 等修饰键时保存不完整快捷键。
      if (parts.length >= 2 && !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
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
        <button className="btn-primary"
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
          <button className="btn-ghost" onClick={() => setShowKey(!showKey)}>{showKey ? '隐藏' : '显示'}</button>
          <button className="btn-primary" onClick={saveKey}>保存</button>
        </div>
      </Field>
      <Field label={`温度 ${settings.aiTemperature.toFixed(1)}`}>
        <input type="range" min="0" max="1.5" step="0.1" value={settings.aiTemperature}
          onChange={(e) => update({ aiTemperature: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--accent)' }} />
      </Field>
      <Field label="答题 AI 解析提示词">
        <textarea className="input-apple" value={settings.quizAiPrompt}
          onChange={(e) => update({ quizAiPrompt: e.target.value })}
          rows={8}
          style={{ resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }} />
        <p style={s.help}>可使用变量：{'{question}'}、{'{options}'}、{'{correctAnswer}'}、{'{userAnswer}'}、{'{explanation}'}。</p>
      </Field>
      <Row label="发送任务上下文给 AI"><Toggle checked={settings.aiSendTaskContext} onChange={(v) => update({ aiSendTaskContext: v })} /></Row>
      <div style={s.inline}>
        <button className="btn-primary" disabled={testing} onClick={test}>{testing ? '测试中…' : '测试连接'}</button>
        <span style={s.hint}>{settings.aiApiKey ? '已配置 API Key' : '尚未配置 API Key'}</span>
      </div>
      <p style={s.help}>API Key 仅保存在本机。Base URL 必须是 OpenAI Chat Completions 兼容接口的根地址。</p>
    </Section>

    <Section title="系统行为">
      <Row label="开机自动启动"><Toggle checked={settings.autoStart} onChange={(v) => update({ autoStart: v })} /></Row>
    </Section>

    <Section title="MySQL 数据库">
      <Info text="状态" value={dbStatus?.connected ? `已连接 · ${dbStatus.database}` : '未连接'} />
      <Field label="主机与端口">
        <div style={s.inline}>
          <input className="input-apple" value={dbConfig.host} onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })} placeholder="127.0.0.1" />
          <input className="input-apple" type="number" value={dbConfig.port} onChange={(e) => setDbConfig({ ...dbConfig, port: Number(e.target.value) })} style={{ width: 100 }} />
        </div>
      </Field>
      <Field label="用户名与密码">
        <div style={s.inline}>
          <input className="input-apple" value={dbConfig.user} onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })} placeholder="root" />
          <input className="input-apple" type="password" value={dbConfig.password} onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })} placeholder="密码" />
        </div>
      </Field>
      <Field label="数据库名">
        <input className="input-apple" value={dbConfig.database} onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })} placeholder="palgo" />
      </Field>
      <Row label="启用 SSL"><Toggle checked={dbConfig.ssl} onChange={(v) => setDbConfig({ ...dbConfig, ssl: v })} /></Row>
      <div style={s.inlineBlock}><button className="btn-primary" onClick={bindDatabase}>测试并绑定</button>{dbStatus?.bound && <button className="btn-ghost" onClick={unbindDatabase}>解除绑定</button>}<span style={s.hint}>{dbMessage || '绑定后任务、念头、题库、错题和动态写入 MySQL'}</span></div>
    </Section>

    <Section title="题库管理">
      <div style={s.inlineBlock}><button className="btn-primary" onClick={importBank}>导入 JSON 题库</button><span style={s.hint}>{bankMessage || '导入后题库内容保存到数据库，可脱离原始 JSON 使用'}</span></div>
      {banks.map((bank) => <div key={bank.fileName} style={s.bankRow}>
        <span style={{ minWidth: 0, flex: 1 }}>
          {editingBank === bank.fileName ? <input autoFocus className="input-apple" value={editingBankName} onChange={(e) => setEditingBankName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void renameBank(bank); if (e.key === 'Escape') setEditingBank(null) }} /> : <strong className="bank-name">{bank.name}</strong>}
          <small>{bank.questionCount} 题 · {bank.fileName}</small>
        </span>
        {editingBank === bank.fileName ? <><button className="btn-primary btn-sm" disabled={!editingBankName.trim()} onClick={() => void renameBank(bank)}>保存</button><button className="btn-ghost btn-sm" onClick={() => setEditingBank(null)}>取消</button></> : <><button className="btn-ghost btn-sm" onClick={() => { setEditingBank(bank.fileName); setEditingBankName(bank.name); setBankMessage('') }}>重命名</button><button className="btn-danger btn-sm" onClick={() => void deleteBank(bank)}>删除</button></>}
      </div>)}
    </Section>

    <Section title="喝水提醒">
      <Field label="提醒间隔（分钟，0 为关闭）">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="range" min="0" max="120" step="5" value={settings.drinkReminderMinutes}
            onChange={(e) => update({ drinkReminderMinutes: Number(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--accent)' }} />
          <span style={s.sliderValue}>
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
          <span style={s.sliderValue}>
            {settings.standReminderMinutes === 0 ? '关闭' : `${settings.standReminderMinutes} 分钟`}
          </span>
        </div>
      </Field>
    </Section>

    <Section title="B站动态跟踪">
      <Row label="启用动态跟踪"><Toggle checked={settings.biliEnabled} onChange={(v) => update({ biliEnabled: v })} /></Row>
      <Row label="新动态系统通知"><Toggle checked={settings.biliNotify} onChange={(v) => update({ biliNotify: v })} /></Row>
      <Field label={`轮询间隔 ${settings.biliIntervalSec} 秒`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="range" min="15" max="300" step="5" value={settings.biliIntervalSec}
            onChange={(e) => update({ biliIntervalSec: Number(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--accent)' }} />
          <span style={s.sliderValue}>
            {settings.biliIntervalSec} 秒
          </span>
        </div>
      </Field>
      <Field label="添加 UP 主（B站空间链接或 UID）">
        <div style={s.inline}>
          <input className="input-apple" value={biliInput}
            onChange={(e) => setBiliInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddBiliUp()}
            placeholder="https://space.bilibili.com/xxx"
            style={{ flex: 1, minWidth: 0 }} />
          <button className="btn-primary" disabled={biliAdding || !biliInput.trim()} onClick={handleAddBiliUp}>
            {biliAdding ? '添加中…' : '关注'}
          </button>
        </div>
        {biliMsg && <p style={s.help}>{biliMsg}</p>}
      </Field>
      {biliUps.length > 0 && (
        <Field label={`已关注 ${biliUps.length} 位 UP 主（「动态」页展示最近 3 天动态，更新时推送系统通知）`}>
          {biliUps.map((up) => (
            <div key={up.mid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', background: 'rgba(118,118,128,0.06)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: 'var(--text-md)' }}>
                <span style={{ position: 'relative', display: 'inline-grid', placeItems: 'center', width: 20, height: 20, marginRight: 6, borderRadius: '50%', verticalAlign: 'middle', overflow: 'hidden', background: 'var(--accent-bg)', color: 'var(--accent)', fontSize: 10, fontWeight: 700 }}>
                  {up.name.slice(0, 1)}
                  {up.avatar && <img src={up.avatar} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                </span>
                {up.name}
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginLeft: 6 }}>UID {up.mid}</span>
              </span>
              <button className="btn-ghost btn-sm" onClick={() => handleRemoveBiliUp(up.mid)}>移除</button>
            </div>
          ))}
        </Field>
      )}
      <Field label="Cookie（可选）">
        <div style={s.inline}>
          <input className="input-apple" type="text" value={biliCookie}
            onChange={(e) => setBiliCookie(e.target.value)}
            placeholder="SESSDATA=xxx; buvid3=xxx"
            style={{ flex: 1, minWidth: 0 }} />
          <button className="btn-primary" onClick={saveBiliCookie}>保存</button>
        </div>
        <p style={s.help}>请求被B站风控拦截时，从浏览器登录B站后复制 Cookie 填入此处。仅保存在本机。</p>
      </Field>
    </Section>
  </main>
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100%', padding: '28px 32px 44px', background: '#f2f2f7', color: 'var(--text-primary)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  title: { fontSize: 'var(--text-2xl)', fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' },
  subtitle: { color: 'var(--text-secondary)', marginTop: 4, fontSize: 'var(--text-md)' },
  status: { color: 'var(--success)', fontSize: 'var(--text-xs)', fontWeight: 500 },
  inline: { display: 'flex', gap: 8, alignItems: 'center', width: '100%' },
  inlineBlock: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const, padding: '12px 16px' },
  bankRow: { display: 'flex', alignItems: 'center', gap: 8, margin: '0 16px 8px', padding: '9px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(118,118,128,0.06)' },
  hint: { color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' },
  help: { color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', lineHeight: 1.6, marginTop: 4 },
  sliderValue: { fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', minWidth: 40, textAlign: 'right' },
  kbd: {
    display: 'inline-block', padding: '3px 8px',
    fontSize: 'var(--text-xs)', fontWeight: 600, fontFamily: 'inherit',
    color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.04)',
    borderRadius: 5, border: '1px solid rgba(0,0,0,0.08)',
    letterSpacing: '0.02em',
  },
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section style={{ marginBottom: 24 }}>
    <h2 style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, paddingLeft: 2 }}>{title}</h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--hairline)' }}>
      {React.Children.map(children, (child, i) => (
        <div style={{ borderBottom: i < React.Children.count(children) - 1 ? '1px solid var(--hairline)' : 'none' }}>
          {child}
        </div>
      ))}
    </div>
  </section>
)

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
    <span style={{ fontSize: 'var(--text-md)' }}>{label}</span>{children}
  </div>
)

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px', gap: 7 }}>
    <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', fontWeight: 500 }}>{label}</span>
    {children}
  </div>
)

const Info: React.FC<{ text: string; value: string }> = ({ text, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
    <span style={{ fontSize: 'var(--text-md)' }}>{text}</span>
    <strong style={{ fontSize: 'var(--text-md)', color: 'var(--accent)' }}>{value}</strong>
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
    <span style={{ fontSize: 'var(--text-md)' }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {recording ? (
        <>
          <kbd style={s.kbd} className="recording">按下组合键…</kbd>
          <button className="btn-ghost btn-sm" onClick={onCancel}>取消</button>
        </>
      ) : (
        <>
          <kbd style={s.kbd}>{formatShortcut(value)}</kbd>
          <button className="btn-ghost btn-sm" onClick={onRecord}>修改</button>
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
    <span style={{ fontSize: 'var(--text-md)' }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {recording ? (
        <>
          <kbd style={s.kbd} className="recording">按下按键…</kbd>
          <button className="btn-ghost btn-sm" onClick={onCancel}>取消</button>
        </>
      ) : (
        <>
          <kbd style={s.kbd}>{formatQuizKey(value)}</kbd>
          <button className="btn-ghost btn-sm" onClick={onRecord}>修改</button>
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
