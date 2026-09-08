import React from 'react'
import { PanelSidebar } from '../components/PanelSidebar'
import { QuestionBankInfo, QuestionBank, Question, QuizRecord, QuizShortcutConfig, Settings, QuizProgress } from '@shared/types'

type SavedState = QuizProgress

/** 所有题库的进度映射：bankFileName -> SavedState */
type AllProgress = Record<string, SavedState>

function loadLegacyProgress(): AllProgress {
  try {
    const raw = localStorage.getItem('quiz_state')
    return raw ? JSON.parse(raw) as AllProgress : {}
  } catch { return {} }
}

function isAnswerCorrect(question: Question, userAnswer: number | number[] | string): boolean {
  if (question.type === 'multiple_choice') {
    const correct = Array.isArray(question.answer) ? [...question.answer].sort() : [question.answer as number]
    const user = Array.isArray(userAnswer) ? [...userAnswer].sort() : [userAnswer as number]
    return correct.length === user.length && correct.every((v, i) => v === user[i])
  }
  if (question.type === 'short_answer') {
    return typeof userAnswer === 'string' && typeof question.answer === 'string' &&
      userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase()
  }
  return userAnswer === question.answer
}

export const QuizPage: React.FC = () => {
  const [banks, setBanks] = React.useState<QuestionBankInfo[]>([])
  const [loadingBanks, setLoadingBanks] = React.useState(true)
  const [bank, setBank] = React.useState<QuestionBank | null>(null)
  const [bankFileName, setBankFileName] = React.useState('')
  const [qIndex, setQIndex] = React.useState(0)
  const [selected, setSelected] = React.useState<number | number[] | string | null>(null)
  const [answered, setAnswered] = React.useState(false)
  const [records, setRecords] = React.useState<QuizRecord[]>([])
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiExplanation, setAiExplanation] = React.useState('')
  const [quizAiPrompt, setQuizAiPrompt] = React.useState('')
  const [finished, setFinished] = React.useState(false)
  const [restored, setRestored] = React.useState(false)
  const [showResume, setShowResume] = React.useState<{ fileName: string; saved: SavedState } | null>(null)
  const [allProgress, setAllProgress] = React.useState<AllProgress>({})
  const [quizShortcuts, setQuizShortcuts] = React.useState<QuizShortcutConfig>({
    selectA: 'A', selectB: 'B', selectC: 'C', selectD: 'D',
    nextQuestion: 'Enter', prevQuestion: 'ArrowLeft'
  })

  // 加载答题快捷键设置
  React.useEffect(() => {
    window.pet.settings.get().then((s: Settings) => {
      if (s.quizShortcuts) setQuizShortcuts(s.quizShortcuts)
      setQuizAiPrompt(s.quizAiPrompt)
    })
  }, [])

  // 加载题库列表
  React.useEffect(() => {
    window.pet.quiz.listBanks().then((b: QuestionBankInfo[]) => { setBanks(b); setLoadingBanks(false) })
  }, [])

  // 自动恢复上次进度
  React.useEffect(() => {
    if (restored || loadingBanks || banks.length === 0) return
    void (async () => {
      try {
      const legacy = loadLegacyProgress()
      const stored = await window.pet.quiz.listProgress()
      const all = { ...legacy, ...stored }
      const storedNames = new Set(Object.keys(stored))
      await Promise.all(Object.values(legacy)
        .filter((entry) => !storedNames.has(entry.bankFileName))
        .map((entry) => window.pet.quiz.saveProgress(entry)))
      try { localStorage.removeItem('quiz_state') } catch { /* ignore */ }
      setAllProgress(all)
      const entries = Object.values(all).filter((e) => e.records.length > 0)
      if (entries.length === 0) { setRestored(true); return }
      // 恢复最后答题的那个题库
      const saved = entries.reduce((a, b) =>
        (a.records[a.records.length - 1]?.answeredAt ?? 0) > (b.records[b.records.length - 1]?.answeredAt ?? 0) ? a : b
      )
      const b = await window.pet.quiz.loadBank(saved.bankFileName)
        if (b) {
          setBank(b)
          setBankFileName(saved.bankFileName)
          setQIndex(Math.min(saved.qIndex, b.questions.length - 1))
          setRecords(saved.records || [])
          const cur = b.questions[Math.min(saved.qIndex, b.questions.length - 1)]
          const prev = (saved.records || []).find((r) => r.questionId === cur.id)
          if (prev) {
            setSelected(prev.userAnswer as number | number[] | string)
            setAnswered(true)
            if (prev.aiExplanation) setAiExplanation(prev.aiExplanation)
          }
        }
        setRestored(true)
      } catch { setRestored(true) }
    })()
  }, [loadingBanks, banks])

  // 持久化进度
  const persist = (bn: string, idx: number, recs: QuizRecord[]) => {
    const progress: SavedState = { bankFileName: bn, qIndex: idx, records: recs }
    setAllProgress((prev) => ({ ...prev, [bn]: progress }))
    void window.pet.quiz.saveProgress(progress)
  }

  const startFresh = async (fileName: string) => {
    const all = { ...allProgress }
    delete all[fileName]
    setAllProgress(all)
    setShowResume(null)
    await window.pet.quiz.deleteProgress(fileName)
    const b = await window.pet.quiz.loadBank(fileName)
    if (b) {
      setBank(b); setBankFileName(fileName); setQIndex(0); setSelected(null); setAnswered(false)
      setRecords([]); setAiExplanation(''); setFinished(false)
      persist(fileName, 0, [])
    }
  }

  const resumeQuiz = async (fileName: string, saved: SavedState) => {
    setShowResume(null)
    const b = await window.pet.quiz.loadBank(fileName)
    if (b) {
      setBank(b); setBankFileName(fileName)
      setQIndex(Math.min(saved.qIndex, b.questions.length - 1))
      setRecords(saved.records || [])
      setFinished(false)
      const cur = b.questions[Math.min(saved.qIndex, b.questions.length - 1)]
      const prev = (saved.records || []).find((r) => r.questionId === cur.id)
      if (prev) {
        setSelected(prev.userAnswer as number | number[] | string)
        setAnswered(true)
        if (prev.aiExplanation) setAiExplanation(prev.aiExplanation)
      } else {
        setSelected(null); setAnswered(false); setAiExplanation('')
      }
    }
  }

  const startQuiz = async (fileName: string) => {
    const all = await window.pet.quiz.listProgress()
    setAllProgress(all)
    const saved = all[fileName]
    if (saved && saved.records.length > 0) {
      setShowResume({ fileName, saved })
      return
    }
    await startFresh(fileName)
  }

  const question: Question | null = bank?.questions[qIndex] ?? null
  const correctCount = records.filter((r) => r.correct).length
  const totalCount = bank?.questions.length ?? 0
  const isMulti = question?.type === 'multiple_choice'

  const goTo = (idx: number) => {
    if (!bank || idx < 0 || idx >= totalCount) return
    setQIndex(idx); setSelected(null); setAnswered(false); setAiExplanation('')
    const prev = records.find((r) => r.questionId === bank.questions[idx].id)
    if (prev) {
      setSelected(prev.userAnswer as number | number[] | string)
      setAnswered(true)
      if (prev.aiExplanation) setAiExplanation(prev.aiExplanation)
    }
    persist(bankFileName, idx, records)
  }

  const handleSelect = (idx: number) => {
    if (answered || !question) return
    setSelected(idx); setAnswered(true)
    const correct = isAnswerCorrect(question, idx)
    saveRecord(idx, correct)
    if (!correct) void window.pet.quiz.addWrong(bankFileName, question, idx)
  }

  const handleToggleMulti = (idx: number) => {
    if (answered || !question) return
    setSelected((prev) => {
      const arr = Array.isArray(prev) ? [...prev] : []
      const pos = arr.indexOf(idx)
      if (pos >= 0) arr.splice(pos, 1)
      else arr.push(idx)
      return arr.length > 0 ? arr : null
    })
  }

  const handleConfirmMulti = () => {
    if (answered || !question || !Array.isArray(selected) || selected.length === 0) return
    setAnswered(true)
    const correct = isAnswerCorrect(question, selected)
    saveRecord(selected, correct)
    if (!correct) void window.pet.quiz.addWrong(bankFileName, question, selected)
  }

  const handleShortAnswer = () => {
    if (answered || !question || question.type !== 'short_answer' || typeof selected !== 'string' || !selected.trim()) return
    const correct = isAnswerCorrect(question, selected)
    setAnswered(true)
    saveRecord(selected, correct)
    if (!correct) void window.pet.quiz.addWrong(bankFileName, question, selected)
  }

  const saveRecord = (userAnswer: number | number[] | string, correct: boolean) => {
    if (!question) return
    const existingIdx = records.findIndex((r) => r.questionId === question.id)
    const newRecord: QuizRecord = { questionId: question.id, userAnswer, correct, answeredAt: Date.now() }
    let newRecords: QuizRecord[]
    if (existingIdx >= 0) {
      newRecords = [...records]
      newRecords[existingIdx] = newRecord
    } else {
      newRecords = [...records, newRecord]
    }
    setRecords(newRecords)
    persist(bankFileName, qIndex, newRecords)
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
    const userAnswer = Array.isArray(selected) ? selected.map((i) => question.options[i]).join('、') : String(question.options[selected as number] ?? selected)
      const correctAnswer = Array.isArray(question.answer) ? (question.answer as number[]).map((i) => question.options[i]).join('、') : String(question.options[question.answer as number] ?? question.answer)
      const replacements: Record<string, string> = {
        question: question.question,
        options: question.options.join('；'),
        correctAnswer,
        userAnswer,
        explanation: question.explanation || '无'
      }
      const prompt = (quizAiPrompt || '请简要解析这道题目：\n\n题目：{question}\n选项：{options}\n正确答案：{correctAnswer}\n我的答案：{userAnswer}\n题目解析：{explanation}\n\n请用1-2句话说明对错原因和需要掌握的知识点。').replace(/\{(question|options|correctAnswer|userAnswer|explanation)\}/g, (_, key: string) => replacements[key])
      const result = await window.pet.ai.chat(prompt)
      const text = result.content || result.error || '解析失败'
      setAiExplanation(text)
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
    setShowResume(null)
    setBank(null); setFinished(false)
  }

  // 键盘快捷键
  React.useEffect(() => {
    if (!bank || finished || showResume) return
    const h = (e: KeyboardEvent) => {
      if (!question) return
      const rawKey = e.key.length === 1 ? e.key.toUpperCase() : e.key
      const qs = quizShortcuts
      if (!answered) {
        const selectKeys = [qs.selectA, qs.selectB, qs.selectC, qs.selectD]
        const idx = selectKeys.findIndex((k) => rawKey === k.toUpperCase())
        if (idx >= 0 && question.options.length > idx) {
          e.preventDefault()
          if (isMulti) handleToggleMulti(idx)
          else handleSelect(idx)
        }
        if (isMulti && (rawKey === ' ' || rawKey.toUpperCase() === qs.nextQuestion.toUpperCase())) {
          e.preventDefault(); handleConfirmMulti()
        }
        if (question.type === 'short_answer' && rawKey.toUpperCase() === qs.nextQuestion.toUpperCase()) {
          e.preventDefault(); handleShortAnswer()
        }
      } else {
        if (rawKey.toUpperCase() === qs.nextQuestion.toUpperCase() || e.key === ' ' || e.key === 'ArrowRight') {
          e.preventDefault(); handleNext()
        }
      }
      if (rawKey.toUpperCase() === qs.prevQuestion.toUpperCase()) {
        e.preventDefault(); handlePrev()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [bank, qIndex, answered, question, finished, totalCount, quizShortcuts, isMulti, showResume])

  const renderOptions = () => {
    if (!question) return null
    if (question.type === 'short_answer') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <textarea
            className="input-apple"
            rows={4}
            value={typeof selected === 'string' ? selected : ''}
            disabled={answered}
            placeholder="输入你的答案…"
            onChange={(e) => setSelected(e.target.value)}
            style={{ resize: 'vertical', lineHeight: 1.5 }}
          />
          {!answered && <button className="btn-primary" onClick={handleShortAnswer} disabled={typeof selected !== 'string' || !selected.trim()}>提交答案</button>}
        </div>
      )
    }
    return question.options.map((opt, i) => {
      const isCorrectAnswer = Array.isArray(question.answer)
        ? (question.answer as number[]).includes(i)
        : i === question.answer
      const isUserSelected = Array.isArray(selected) ? selected.includes(i) : selected === i
      const isWrong = answered && isUserSelected && !isCorrectAnswer

      let bg = 'transparent'
      let border = '1px solid transparent'
      if (answered) {
        if (isCorrectAnswer) { bg = 'var(--success-bg)'; border = '1px solid var(--success)' }
        else if (isWrong) { bg = 'var(--danger-bg)'; border = '1px solid var(--danger)' }
      } else if (isMulti) {
        if (isUserSelected) { bg = 'var(--accent-bg)'; border = '1px solid var(--accent)' }
      }
      const opacity = answered && !isCorrectAnswer && !isWrong ? 0.4 : 1

      const handleClick = () => {
        if (isMulti) handleToggleMulti(i)
        else handleSelect(i)
      }

      return (
        <button key={i} className="quiz-option" onClick={handleClick} disabled={answered}
          style={{ background: bg, border, opacity }}>
          <span className={isMulti ? 'opt-check' : 'opt-idx'}>
            {isMulti ? (isUserSelected ? '☑' : '☐') : String.fromCharCode(65 + i)}
          </span>
          <span className="opt-text">{opt.replace(/^[A-D][.、]\s?/, '')}</span>
          {answered && isCorrectAnswer && <span style={{ fontSize: 'var(--text-sm)', flexShrink: 0 }}>✓</span>}
          {isWrong && <span style={{ fontSize: 'var(--text-sm)', flexShrink: 0 }}>✗</span>}
        </button>
      )
    })
  }

  if (showResume) {
    const saved = showResume.saved
    const done = saved.records.filter((r) => r.correct).length
    return (
      <main className="panel-root">
        <PanelSidebar />
        <div style={{ ...s.selectWrap, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{ fontSize: 'var(--text-2xl)' }}>📝</div>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>发现未完成的答题记录</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textAlign: 'center' }}>
            已完成 {saved.records.length} 题，正确 {done} 题
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button className="btn-ghost" onClick={() => startFresh(showResume.fileName)}>
              重新开始
            </button>
            <button className="btn-primary" onClick={() => resumeQuiz(showResume.fileName, saved)}>
              继续答题
            </button>
          </div>
        </div>
      </main>
    )
  }

  return <main className="panel-root">
    <PanelSidebar />
    <div style={s.content}>
      {!bank ? (
        <div style={s.selectWrap}>
          <div className="section-title" style={{ fontSize: 'var(--text-md)', textTransform: 'none', letterSpacing: '-0.01em', color: 'var(--text-primary)', marginBottom: 5 }}>选择题库</div>
          {loadingBanks ? <div style={s.centered}>加载中...</div> :
           banks.length === 0 ? <div style={s.centered}><div style={{ fontSize: 'var(--text-2xl)', marginBottom: 3 }}>📂</div><div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>暂无题库</div><div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>将 JSON 题库放入 question-banks 目录</div></div> :
           (banks.map((b) => {
             const progress = allProgress[b.fileName]
             const hasProgress = progress && progress.records.length > 0
             const doneCount = hasProgress ? progress.records.filter((r) => r.correct).length : 0
             return (
            <button key={b.fileName} onClick={() => startQuiz(b.fileName)} style={s.bankItem}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.bankName}>{b.name}</div>
                <div style={s.bankDesc}>{b.description}</div>
                {hasProgress && (
                  <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--accent)', marginTop: 2, fontWeight: 500 }}>
                    进度 {progress.records.length}/{b.questionCount} · 正确 {doneCount}
                  </div>
                )}
              </div>
              <div style={s.bankCount}>{b.questionCount} 题</div>
            </button>
             )}))}
        </div>
      ) : finished ? (
        <div style={s.resultWrap}>
          <div style={{ fontSize: 'var(--text-2xl)', marginBottom: 2 }}>🎉</div>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>答题完成</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>正确 {correctCount} / {totalCount} 题</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 5 }}>
            <button className="btn-ghost btn-sm" onClick={backToBanks}>返回题库</button>
            <button className="btn-primary btn-sm" onClick={() => startFresh(bankFileName)}>再来一次</button>
          </div>
        </div>
      ) : question ? (
        <div style={s.quizWrap}>
          {/* 顶栏 */}
          <div style={s.topBar}>
            <button onClick={backToBanks} className="btn-ghost btn-sm" style={{ padding: '2px 8px' }}>← 题库</button>
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>{qIndex + 1}/{totalCount}</span>
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--accent)' }}>✓{correctCount}</span>
          </div>
          {/* 题目 */}
          <div style={s.questionText}>{question.question}</div>
          {/* 选项 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{renderOptions()}</div>
          {/* 多选确认按钮 */}
          {isMulti && !answered && Array.isArray(selected) && selected.length > 0 && (
            <button className="btn-primary" onClick={handleConfirmMulti} style={{ marginTop: 6, padding: '5px 0', width: '100%', textAlign: 'center' }}>
              确认选择 ({selected.length} 项)
            </button>
          )}
          {/* 反馈 & 导航 */}
          {answered && (
            <div style={s.feedback}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: selected !== null && isAnswerCorrect(question, selected) ? 'var(--success)' : 'var(--danger)', whiteSpace: 'nowrap' as const }}>
                  {selected !== null && isAnswerCorrect(question, selected) ? '✓ 正确' : '✗ 错误'}
                </span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', flex: 1, lineHeight: 1.4 }}>{question.explanation}</span>
                {!aiExplanation && (
                  <button onClick={handleAiExplain} disabled={aiLoading} className="btn-ghost btn-sm" style={{ whiteSpace: 'nowrap' as const }}>
                    {aiLoading ? '...' : 'AI解析'}
                  </button>
                )}
              </div>
              {aiExplanation && (
                <div style={{ marginTop: 4, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5, padding: '4px 6px', background: 'var(--accent-bg)', borderRadius: 'var(--radius-sm)' }}>
                  {aiExplanation}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <button onClick={handlePrev} disabled={qIndex === 0} className="btn-ghost btn-sm" style={{ opacity: qIndex === 0 ? 0.3 : 1 }}>上一题</button>
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>
                  {isMulti ? 'Space 确认 · Enter/→ 下一题 · ← 上一题' : 'A-D 选择 · Enter/→ 下一题 · ← 上一题'}
                </span>
                <button onClick={handleNext} className="btn-primary btn-sm">
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

const s: Record<string, React.CSSProperties> = {
  content: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', minWidth: 0 },
  selectWrap: { flex: 1, overflowY: 'auto', padding: '6px 8px' },
  centered: { textAlign: 'center' as const, color: 'var(--text-secondary)', padding: 16, fontSize: 'var(--text-sm)' },
  bankItem: { display: 'flex', alignItems: 'center', gap: 5, padding: '8px 10px', marginBottom: 4, borderRadius: 'var(--radius-md)', background: 'var(--surface)', border: '1px solid var(--hairline)', cursor: 'pointer', textAlign: 'left' as const, width: '100%' },
  bankName: { fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' },
  bankDesc: { fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', marginTop: 1, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
  bankCount: { fontSize: 'var(--text-2xs)', color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' as const },
  // 答题
  quizWrap: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '6px 10px', overflowY: 'auto' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2, minHeight: 20 },
  questionText: { fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 4 },
  feedback: { marginTop: 4, padding: '6px 8px', background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)' },
  resultWrap: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 12 },
}
