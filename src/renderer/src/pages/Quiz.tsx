import React from 'react'
import { useRouter } from '../router'
import { QuestionBankInfo, QuestionBank, Question, QuizRecord, QuizShortcutConfig } from '@shared/types'

const TABS = [
  { key: 'notes', path: '/task-panel', label: '笔记', icon: '📋' },
  { key: 'quiz', path: '/quiz', label: '答题', icon: '✏️' },
  { key: 'wrong', path: '/wrong-book', label: '错题', icon: '📖' },
] as const

const LS_KEY = 'quiz_state'

interface SavedState {
  bankFileName: string
  qIndex: number
  records: QuizRecord[]
}

export const QuizPage: React.FC = () => {
  const { navigate, path } = useRouter()
  const [banks, setBanks] = React.useState<QuestionBankInfo[]>([])
  const [loadingBanks, setLoadingBanks] = React.useState(true)
  const [bank, setBank] = React.useState<QuestionBank | null>(null)
  const [bankFileName, setBankFileName] = React.useState('')
  const [qIndex, setQIndex] = React.useState(0)
  const [selected, setSelected] = React.useState<number | null>(null)
  const [answered, setAnswered] = React.useState(false)
  const [records, setRecords] = React.useState<QuizRecord[]>([])
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiExplanation, setAiExplanation] = React.useState('')
  const [finished, setFinished] = React.useState(false)
  const [restored, setRestored] = React.useState(false)
  const [quizShortcuts, setQuizShortcuts] = React.useState<QuizShortcutConfig>({
    selectA: 'A', selectB: 'B', selectC: 'C', selectD: 'D',
    nextQuestion: 'Enter', prevQuestion: 'ArrowLeft'
  })

  // 加载答题快捷键设置
  React.useEffect(() => {
    window.pet.settings.get().then((s) => {
      if (s.quizShortcuts) setQuizShortcuts(s.quizShortcuts)
    })
  }, [])

  // 加载题库列表
  React.useEffect(() => {
    window.pet.quiz.listBanks().then((b: QuestionBankInfo[]) => { setBanks(b); setLoadingBanks(false) })
  }, [])

  // 自动恢复上次进度
  React.useEffect(() => {
    if (restored || loadingBanks || banks.length === 0) return
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) { setRestored(true); return }
      const saved: SavedState = JSON.parse(raw)
      if (!saved.bankFileName) { setRestored(true); return }
      window.pet.quiz.loadBank(saved.bankFileName).then((b) => {
        if (b) {
          setBank(b)
          setBankFileName(saved.bankFileName)
          setQIndex(Math.min(saved.qIndex, b.questions.length - 1))
          setRecords(saved.records || [])
          // 恢复当前题目的答题状态
          const cur = b.questions[Math.min(saved.qIndex, b.questions.length - 1)]
          const prev = (saved.records || []).find((r) => r.questionId === cur.id)
          if (prev) {
            setSelected(prev.userAnswer as number)
            setAnswered(true)
            if (prev.aiExplanation) setAiExplanation(prev.aiExplanation)
          }
        }
        setRestored(true)
      })
    } catch {
      setRestored(true)
    }
  }, [loadingBanks, banks])

  // 持久化进度
  const persist = (bn: string, idx: number, recs: QuizRecord[]) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ bankFileName: bn, qIndex: idx, records: recs })) } catch { /* ignore */ }
  }

  const startQuiz = async (fileName: string) => {
    localStorage.removeItem(LS_KEY)
    const b = await window.pet.quiz.loadBank(fileName)
    if (b) {
      setBank(b); setBankFileName(fileName); setQIndex(0); setSelected(null); setAnswered(false)
      setRecords([]); setAiExplanation(''); setFinished(false)
      persist(fileName, 0, [])
    }
  }

  const question: Question | null = bank?.questions[qIndex] ?? null
  const correctCount = records.filter((r) => r.correct).length
  const totalCount = bank?.questions.length ?? 0

  const goTo = (idx: number) => {
    if (!bank || idx < 0 || idx >= totalCount) return
    setQIndex(idx); setSelected(null); setAnswered(false); setAiExplanation('')
    const prev = records.find((r) => r.questionId === bank.questions[idx].id)
    if (prev) {
      setSelected(prev.userAnswer as number)
      setAnswered(true)
      if (prev.aiExplanation) setAiExplanation(prev.aiExplanation)
    }
    persist(bankFileName, idx, records)
  }

  const handleSelect = (idx: number) => {
    if (answered || !question) return
    setSelected(idx); setAnswered(true)
    const correct = idx === question.answer
    // 避免重复记录：如果已存在该题记录则替换
    const existingIdx = records.findIndex((r) => r.questionId === question.id)
    const newRecord: QuizRecord = { questionId: question.id, userAnswer: idx, correct, answeredAt: Date.now() }
    let newRecords: QuizRecord[]
    if (existingIdx >= 0) {
      newRecords = [...records]
      newRecords[existingIdx] = newRecord
    } else {
      newRecords = [...records, newRecord]
    }
    setRecords(newRecords)
    persist(bankFileName, qIndex, newRecords)
    // 触发宠物动画
    window.pet.anim.sendQuizEvent(correct ? 'correct' : 'wrong')
  }

  const handleNext = () => {
    if (qIndex + 1 < totalCount) { goTo(qIndex + 1) } else { setFinished(true) }
  }

  const handlePrev = () => { if (qIndex > 0) goTo(qIndex - 1) }

  const handleAiExplain = async () => {
    if (!question || aiLoading) return
    setAiLoading(true); setAiExplanation('')
    try {
      const prompt = `请简要解析这道题目：\n\n题目：${question.question}\n选项：${question.options.join('；')}\n正确答案：${question.options[question.answer as number]}\n我的答案：${question.options[selected!]}\n\n请用1-2句话说明对错原因和知识点。`
      const result = await window.pet.ai.chat(prompt)
      const text = result.content || result.error || '解析失败'
      setAiExplanation(text)
      // 保存 AI 解析到记录
      const recIdx = records.findIndex((r) => r.questionId === question.id)
      if (recIdx >= 0) {
        const newRecords = [...records]
        newRecords[recIdx] = { ...newRecords[recIdx], aiExplanation: text }
        setRecords(newRecords)
        persist(bankFileName, qIndex, newRecords)
      }
    } catch { setAiExplanation('AI 解析请求失败') }
    setAiLoading(false)
  }

  const backToBanks = () => {
    localStorage.removeItem(LS_KEY)
    setBank(null); setFinished(false)
  }

  // 键盘快捷键
  React.useEffect(() => {
    if (!bank || finished) return
    const h = (e: KeyboardEvent) => {
      if (!question) return
      const rawKey = e.key.length === 1 ? e.key.toUpperCase() : e.key
      const qs = quizShortcuts
      // 选择选项
      if (!answered) {
        const selectKeys = [qs.selectA, qs.selectB, qs.selectC, qs.selectD]
        const idx = selectKeys.findIndex((k) => rawKey === k.toUpperCase())
        if (idx >= 0 && question.options.length > idx) {
          e.preventDefault(); handleSelect(idx)
        }
      } else {
        // 下一题
        if (rawKey === qs.nextQuestion.toUpperCase() || e.key === ' ' || e.key === 'ArrowRight') {
          e.preventDefault(); handleNext()
        }
      }
      // 上一题（任何时候都可以）
      if (rawKey === qs.prevQuestion.toUpperCase()) {
        e.preventDefault(); handlePrev()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [bank, qIndex, answered, question, finished, totalCount, quizShortcuts])

  const renderOptions = () => {
    if (!question) return null
    return question.options.map((opt, i) => {
      const isCorrect = i === question.answer
      const isWrong = answered && i === selected && selected !== question.answer
      const bg = answered
        ? isCorrect ? 'var(--success-bg)' : isWrong ? 'var(--danger-bg)' : 'transparent'
        : i === selected ? 'var(--accent-bg)' : 'transparent'
      const border = answered
        ? isCorrect ? '1px solid var(--success)' : isWrong ? '1px solid var(--danger)' : '1px solid transparent'
        : i === selected ? '1px solid var(--accent)' : '1px solid transparent'
      const opacity = answered && !isCorrect && !isWrong ? 0.4 : 1
      return (
        <button key={i} onClick={() => handleSelect(i)} disabled={answered}
          style={{ ...s.opt, background: bg, border, opacity }}>
          <span style={s.optIdx}>{String.fromCharCode(65 + i)}</span>
          <span style={s.optText}>{opt.replace(/^[A-D][.、]\s?/, '')}</span>
          {answered && isCorrect && <span style={{ marginLeft: 'auto', fontSize: 11 }}>✓</span>}
          {isWrong && <span style={{ marginLeft: 'auto', fontSize: 11 }}>✗</span>}
        </button>
      )
    })
  }

  return <main style={s.root}>
    <Sidebar path={path} navigate={navigate} />
    <div style={s.content}>
      {!bank ? (
        <div style={s.selectWrap}>
          <div style={s.title}>选择题库</div>
          {loadingBanks ? <div style={s.centered}>加载中...</div> :
           banks.length === 0 ? <div style={s.centered}><div style={{ fontSize: 22, marginBottom: 3 }}>📂</div><div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>暂无题库</div><div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>将 JSON 题库放入 question-banks 目录</div></div> :
           (banks.map((b) => (
            <button key={b.fileName} onClick={() => startQuiz(b.fileName)} style={s.bankItem}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.bankName}>{b.name}</div>
                <div style={s.bankDesc}>{b.description}</div>
              </div>
              <div style={s.bankCount}>{b.questionCount} 题</div>
            </button>
          )))}
        </div>
      ) : finished ? (
        <div style={s.resultWrap}>
          <div style={{ fontSize: 24, marginBottom: 2 }}>🎉</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>答题完成</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>正确 {correctCount} / {totalCount} 题</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 5 }}>
            <button className="btn-ghost" style={{ fontSize: 10 }} onClick={backToBanks}>返回题库</button>
            <button className="btn-primary" style={{ fontSize: 10 }} onClick={() => startQuiz(bankFileName)}>再来一次</button>
          </div>
        </div>
      ) : question ? (
        <div style={s.quizWrap}>
          {/* 顶栏 */}
          <div style={s.topBar}>
            <button onClick={backToBanks} className="btn-ghost" style={{ fontSize: 9, padding: '2px 6px' }}>← 题库</button>
            <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{qIndex + 1}/{totalCount}</span>
            <span style={{ fontSize: 9, color: 'var(--accent)' }}>✓{correctCount}</span>
          </div>
          {/* 题目 */}
          <div style={s.questionText}>{question.question}</div>
          {/* 选项 */}
          <div style={s.optionsGrid}>{renderOptions()}</div>
          {/* 反馈 & 导航 */}
          {answered && (
            <div style={s.feedback}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: selected === question.answer ? 'var(--success)' : 'var(--danger)', whiteSpace: 'nowrap' as const }}>
                  {selected === question.answer ? '✓ 正确' : '✗ 错误'}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{question.explanation}</span>
                {!aiExplanation && (
                  <button onClick={handleAiExplain} disabled={aiLoading} className="btn-ghost" style={{ fontSize: 9, padding: '2px 6px', whiteSpace: 'nowrap' as const }}>
                    {aiLoading ? '...' : 'AI解析'}
                  </button>
                )}
              </div>
              {aiExplanation && (
                <div style={{ marginTop: 3, fontSize: 9, color: 'var(--text-secondary)', lineHeight: 1.35, padding: '3px 5px', background: 'rgba(255,159,10,0.06)', borderRadius: 5 }}>
                  {aiExplanation}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <button onClick={handlePrev} disabled={qIndex === 0} className="btn-ghost" style={{ fontSize: 9, padding: '2px 8px', opacity: qIndex === 0 ? 0.3 : 1 }}>上一题</button>
                <span style={{ fontSize: 8, color: 'var(--text-tertiary)' }}>快捷键: A-D 选择 · Enter/→ 下一题 · ← 上一题</span>
                <button onClick={handleNext} className="btn-primary" style={{ fontSize: 9, padding: '2px 8px' }}>
                  {qIndex + 1 < totalCount ? '下一题' : '查看结果'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  </main>
}

function Sidebar({ path, navigate }: { path: string; navigate: (to: string) => void }) {
  const active = path === '/quiz' ? 'quiz' : path === '/wrong-book' ? 'wrong' : 'notes'
  return (
    <div style={sidebarStyle}>
      {TABS.map((tab) => (
        <button key={tab.key} onClick={() => navigate(tab.path)} style={{
          ...sidebarItem,
          background: active === tab.key ? 'var(--accent-bg)' : 'transparent',
          color: active === tab.key ? 'var(--accent)' : 'var(--text-tertiary)',
          fontWeight: active === tab.key ? 600 : 400,
        }} title={tab.label}>
          <span style={{ fontSize: 16 }}>{tab.icon}</span>
          <span style={{ fontSize: 10, marginTop: 2 }}>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}

const sidebarStyle: React.CSSProperties = { width: 56, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 4px', borderRight: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.02)' }
const sidebarItem: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'all 0.15s ease' }

const s: Record<string, React.CSSProperties> = {
  root: { width: '100%', height: '100%', display: 'flex', background: 'var(--panel-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' },
  content: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
  selectWrap: { flex: 1, overflowY: 'auto', padding: '6px 8px' },
  title: { fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 5 },
  centered: { textAlign: 'center' as const, color: 'var(--text-secondary)', padding: 16, fontSize: 11 },
  bankItem: { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 8px', marginBottom: 2, borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', textAlign: 'left' as const, width: '100%' },
  bankName: { fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' },
  bankDesc: { fontSize: 9, color: 'var(--text-tertiary)', marginTop: 1, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
  bankCount: { fontSize: 9, color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' as const },
  // 答题
  quizWrap: { flex: 1, display: 'flex', flexDirection: 'column', padding: '4px 8px', overflow: 'hidden' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2, minHeight: 20 },
  questionText: { fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: 4, flexShrink: 0 },
  optionsGrid: { display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 },
  opt: {
    display: 'flex', alignItems: 'center', gap: 5, padding: '4px 7px',
    borderRadius: 5, cursor: 'pointer', transition: 'all 0.1s ease',
    textAlign: 'left' as const, width: '100%',
  },
  optIdx: { width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, background: 'rgba(0,0,0,0.06)', color: 'var(--text-secondary)', flexShrink: 0 },
  optText: { fontSize: 10, lineHeight: 1.3, textAlign: 'left' as const },
  feedback: { marginTop: 4, padding: '4px 6px', background: 'rgba(0,0,0,0.02)', borderRadius: 5, flexShrink: 0 },
  resultWrap: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 12 },
}