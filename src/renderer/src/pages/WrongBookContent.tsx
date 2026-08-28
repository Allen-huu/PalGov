import React from "react"
import { WrongQuestion } from "@shared/types"
import { useRouter } from "../router"

const intervals = ['10 分钟', '1 天', '2 天', '4 天', '7 天', '15 天', '30 天']

function formatRemaining(ms: number): string {
  if (ms <= 0) return '现在到期'
  const totalMin = Math.ceil(ms / 60_000)
  if (totalMin < 60) return `约 ${totalMin} 分钟后`
  const totalHour = Math.ceil(totalMin / 60)
  if (totalHour < 24) return `约 ${totalHour} 小时后`
  const totalDay = Math.ceil(totalHour / 24)
  return `约 ${totalDay} 天后`
}

function checkAnswer(q: WrongQuestion["question"], userAnswer: number | number[] | null): boolean {
  if (userAnswer === null) return false
  if (q.type === "multiple_choice") {
    const correct = Array.isArray(q.answer) ? [...q.answer as number[]].sort() : [q.answer as number]
    const user = Array.isArray(userAnswer) ? [...userAnswer].sort() : [userAnswer as number]
    return correct.length === user.length && correct.every((v, i) => v === user[i])
  }
  return userAnswer === q.answer
}

export const WrongBookContent: React.FC = () => {
  const { navigate, path } = useRouter()
  const [items, setItems] = React.useState<WrongQuestion[]>([])
  const [reviewing, setReviewing] = React.useState<WrongQuestion | null>(null)
  const [answer, setAnswer] = React.useState<number | number[] | null>(null)
  const [bankFilter, setBankFilter] = React.useState('all')
  const refresh = React.useCallback(() => { void window.pet.quiz.listWrong().then(setItems) }, [])
  React.useEffect(() => { refresh() }, [refresh])

  // 提取所有题库名
  const bankNames = React.useMemo(() => {
    const names = new Set<string>()
    items.forEach((item) => names.add(item.bankFileName))
    return Array.from(names).sort()
  }, [items])

  // 按题库筛选
  const filtered = bankFilter === 'all' ? items : items.filter((item) => item.bankFileName === bankFilter)
  const due = filtered.filter((item) => item.nextReviewAt <= Date.now())
  const later = filtered.filter((item) => item.nextReviewAt > Date.now())
  const [error, setError] = React.useState("")
  const submit = async () => {
    if (!reviewing || answer === null) return
    try {
      await window.pet.quiz.submitWrongReview(reviewing.id, checkAnswer(reviewing.question, answer))
      setReviewing(null); setAnswer(null); setError("")
      refresh()
    } catch {
      setError("提交失败，请重试")
    }
  }
  if (reviewing) return <Review item={reviewing} answer={answer} setAnswer={setAnswer} submit={submit} cancel={() => { setReviewing(null); setAnswer(null) }} path={path} />
  return (
    <main style={s.root}>
      <Sidebar path={path} navigate={navigate} />
      <div style={s.content}>
        <div style={s.head}>
          <div>
            <div style={s.title}>错题复习</div>
            <div style={s.hint}>艾宾浩斯间隔：{intervals.join("、")}</div>
          </div>
          <button className="btn-ghost" onClick={refresh} style={{ fontSize: 11, padding: "3px 10px" }}>刷新</button>
        </div>
        {bankNames.length > 1 && (
          <div style={{ display: 'flex', gap: 3, marginBottom: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => setBankFilter('all')}
              style={{
                ...s.bankTab,
                background: bankFilter === 'all' ? 'var(--accent-bg)' : 'transparent',
                color: bankFilter === 'all' ? 'var(--accent)' : 'var(--text-tertiary)',
                fontWeight: bankFilter === 'all' ? 600 : 400,
              }}
            >
              全部 ({items.length})
            </button>
            {bankNames.map((name) => {
              const count = items.filter((i) => i.bankFileName === name).length
              return (
                <button
                  key={name}
                  onClick={() => setBankFilter(name)}
                  style={{
                    ...s.bankTab,
                    background: bankFilter === name ? 'var(--accent-bg)' : 'transparent',
                    color: bankFilter === name ? 'var(--accent)' : 'var(--text-tertiary)',
                    fontWeight: bankFilter === name ? 600 : 400,
                  }}
                >
                  {name} ({count})
                </button>
              )
            })}
          </div>
        )}
        {error && (
          <div style={s.error}>
            <span>{error}</span>
            <button className="btn-ghost" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => setError("")}>✕</button>
          </div>
        )}
        {items.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyEmoji}>📚</div>
            <div style={s.emptyTitle}>错题本还是空的</div>
            <p style={s.emptyDesc}>答错的题会自动收集，并按记忆曲线安排复习。</p>
            <button className="btn-primary" onClick={() => navigate("/quiz")} style={{ marginTop: 14 }}>去答题</button>
          </div>
        ) : (
          <>
            <div style={s.summary}>待复习 <b>{due.length}</b> 题 · 共 {items.length} 题</div>
            {due.length ? (
              <>
                <div style={s.sectionTitle}>现在该复习</div>
                {due.map((item) => <Row key={item.id} item={item} onReview={() => setReviewing(item)} />)}
              </>
            ) : (
              <div style={s.emptyDue}>🎉 当前没有到期错题</div>
            )}
            {later.length > 0 && (
              <>
                <div style={s.sectionTitle}>接下来</div>
                {later.map((item) => <Row key={item.id} item={item} />)}
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}

interface ReviewProps {
  item: WrongQuestion
  answer: number | number[] | null
  setAnswer: React.Dispatch<React.SetStateAction<number | number[] | null>>
  submit: () => void
  cancel: () => void
  path: string
}

function Review({ item, answer, setAnswer, submit, cancel, path }: ReviewProps) {
  const { navigate } = useRouter()
  const done = answer !== null
  const correct = checkAnswer(item.question, answer)
  const isLastStage = item.reviewStage >= 6
  const isMulti = item.question.type === "multiple_choice"
  const submitLabel = correct
    ? isLastStage ? "完成复习（移出错题本）" : "安排下一次复习"
    : "从 10 分钟后重新开始"

  const handleClick = (i: number) => {
    if (isMulti) {
      setAnswer((prev) => {
        const arr = Array.isArray(prev) ? [...prev] : []
        const pos = arr.indexOf(i)
        if (pos >= 0) arr.splice(pos, 1)
        else arr.push(i)
        return arr.length > 0 ? arr : null as any
      })
    } else {
      setAnswer(i)
    }
  }

  return (
    <main style={s.root}>
      <Sidebar path={path} navigate={navigate} />
      <div style={s.content}>
        <div style={s.head}>
          <button className="btn-ghost" onClick={cancel} style={{ fontSize: 11, padding: "3px 10px" }}>← 返回</button>
          <span style={s.hint}>第 {item.reviewStage + 1}/{7} 阶段复习</span>
        </div>
        <div style={s.question}>{item.question.question}</div>
        {item.question.options.map((option, index) => {
          const isCorrectAnswer = Array.isArray(item.question.answer)
            ? (item.question.answer as number[]).includes(index)
            : index === item.question.answer
          const isUserSelected = Array.isArray(answer) ? answer.includes(index) : answer === index
          const isWrong = done && isUserSelected && !isCorrectAnswer
          let bg = "transparent"
          let border = "1px solid transparent"
          if (done) {
            if (isCorrectAnswer) { bg = "var(--success-bg)"; border = "1px solid var(--success)" }
            else if (isWrong) { bg = "var(--danger-bg)"; border = "1px solid var(--danger)" }
          } else if (isMulti && isUserSelected) {
            bg = "var(--accent-bg)"; border = "1px solid var(--accent)"
          }
          const opacity = done && !isCorrectAnswer && !isWrong ? 0.4 : 1
          return (
            <button
              key={index}
              disabled={done}
              onClick={() => handleClick(index)}
              style={{ ...s.option, background: bg, border, opacity }}
            >
              <span style={isMulti ? s.optCheckbox : s.optionIdx}>
                {isMulti ? (isUserSelected ? "☑" : "☐") : String.fromCharCode(65 + index)}
              </span>
              <span style={{ flex: 1, fontSize: 12 }}>{option.replace(/^[A-D][.、]\s?/, "")}</span>
              {done && isCorrectAnswer && <span style={{ fontSize: 13, flexShrink: 0 }}>✓</span>}
              {isWrong && <span style={{ fontSize: 13, flexShrink: 0 }}>✗</span>}
            </button>
          )
        })}
        {isMulti && !done && answer !== null && (
          <button className="btn-primary" onClick={submit} style={{ marginTop: 6, fontSize: 12, padding: "5px 0", width: "100%", textAlign: "center" }}>
            确认选择
          </button>
        )}
        {done && (
          <div style={s.feedback}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <strong style={{ color: correct ? "var(--success)" : "var(--danger)", fontSize: 12 }}>
                {correct ? "✓ 回答正确" : "✗ 回答错误"}
              </strong>
            </div>
            {item.question.explanation && (
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 8 }}>
                {item.question.explanation}
              </div>
            )}
            {!isMulti && (
              <button className="btn-primary" onClick={submit} style={{ fontSize: 12, padding: "5px 14px" }}>
                {submitLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function Row({ item, onReview }: { item: WrongQuestion; onReview?: () => void }) {
  return (
    <div style={s.row}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.rowText}>{item.question.question}</div>
        <div style={s.hint}>
          已错 {item.wrongCount} 次 · 第 {item.reviewStage + 1}/{7} 阶段 · {formatRemaining(item.nextReviewAt - Date.now())}
        </div>
      </div>
      {onReview && (
        <button className="btn-primary" onClick={onReview} style={{ fontSize: 11, padding: "4px 12px", flexShrink: 0 }}>
          复习
        </button>
      )}
    </div>
  )
}

function Sidebar({ path, navigate }: { path: string; navigate: (to: string) => void }) {
  const active = path === "/quiz" ? "quiz" : path === "/wrong-book" ? "wrong" : "notes"
  const tabs = [
    { key: "notes", to: "/task-panel", label: "笔记", icon: "📋" },
    { key: "quiz", to: "/quiz", label: "答题", icon: "✏️" },
    { key: "wrong", to: "/wrong-book", label: "错题", icon: "📖" },
  ] as const
  return (
    <div style={s.sidebar}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => navigate(tab.to)}
          style={{
            ...s.sidebarItem,
            background: active === tab.key ? "var(--accent-bg)" : "transparent",
            color: active === tab.key ? "var(--accent)" : "var(--text-tertiary)",
            fontWeight: active === tab.key ? 600 : 400,
          }}
          title={tab.label}
        >
          <span style={{ fontSize: 16 }}>{tab.icon}</span>
          <span style={{ fontSize: 11, marginTop: 2 }}>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: {
    width: "100%", height: "100%", display: "flex",
    background: "var(--panel-bg)",
    backdropFilter: "var(--glass-blur)",
    WebkitBackdropFilter: "var(--glass-blur)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--panel-border)",
    boxShadow: "var(--shadow-lg)",
    overflow: "hidden",
  },
  sidebar: {
    width: 56, flexShrink: 0, display: "flex", flexDirection: "column",
    gap: 2, padding: "8px 4px",
    borderRight: "1px solid var(--panel-border)",
    background: "rgba(0,0,0,0.02)",
  },
  sidebarItem: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 1, padding: "8px 4px", borderRadius: 10,
    border: "none", cursor: "pointer", transition: "all 0.15s ease",
    background: "transparent", outline: "none",
  },
  content: {
    flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
    overflowY: "auto", padding: "6px 8px",
  },
  head: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    marginBottom: 7,
  },
  title: {
    fontSize: 15, fontWeight: 700, color: "var(--text-primary)",
  },
  hint: {
    marginTop: 3, fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.4,
  },
  summary: {
    padding: "6px 8px", marginBottom: 6,
    background: "rgba(255,159,10,.08)",
    borderRadius: 5,
    fontSize: 12, color: "var(--text-primary)",
  },
  error: {
    padding: "6px 10px", marginBottom: 6,
    background: "var(--danger-bg)",
    color: "var(--danger)",
    borderRadius: 5,
    fontSize: 12,
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  empty: {
    flex: 1,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    textAlign: "center",
    padding: 24, lineHeight: 1.6,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: 700, color: "var(--text-primary)" },
  emptyDesc: { marginTop: 8, color: "var(--text-secondary)", fontSize: 12 },
  emptyDue: {
    textAlign: "center", padding: 12,
    color: "var(--text-secondary)", fontSize: 12,
    background: "rgba(0,0,0,.02)",
    borderRadius: 5,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12, fontWeight: 600,
    color: "var(--text-secondary)",
    marginTop: 8, marginBottom: 4,
    paddingLeft: 2,
  },
  row: {
    display: "flex", gap: 6, alignItems: "center",
    padding: "6px 8px", marginBottom: 3,
    background: "rgba(0,0,0,.025)",
    borderRadius: 5,
  },
  rowText: {
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    fontSize: 13, color: "var(--text-primary)",
  },
  question: {
    fontSize: 14, fontWeight: 600,
    color: "var(--text-primary)",
    lineHeight: 1.5, marginBottom: 6,
  },
  option: {
    display: "flex", gap: 7, alignItems: "center",
    width: "100%", padding: "6px 9px", marginBottom: 3,
    textAlign: "left",
    borderRadius: 6, cursor: "pointer",
    transition: "all 0.1s ease",
    fontFamily: "inherit",
  },
  optionIdx: {
    width: 20, height: 20, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 700,
    background: "rgba(0,0,0,0.06)",
    color: "var(--text-secondary)",
    flexShrink: 0,
  },
  optCheckbox: {
    width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, flexShrink: 0,
  },
  feedback: {
    marginTop: 6, padding: "7px 8px",
    background: "rgba(0,0,0,.025)",
    borderRadius: 6,
    lineHeight: 1.5,
  },
}
