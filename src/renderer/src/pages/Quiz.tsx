import React from 'react'
import { useRouter } from '../router'

export const QuizPage: React.FC = () => {
  const { navigate } = useRouter()
  return <main style={{ minHeight: '100%', padding: 18, background: 'linear-gradient(160deg,#fff8ef,#fff0d9)', color: '#60483b' }}>
    <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}><button onClick={() => navigate('/task-panel')} style={button}>←</button><div><div style={{ color: '#b59680', fontSize: 11 }}>噜噜的学习角</div><h1 style={{ margin: '2px 0', fontSize: 22 }}>答题</h1></div></header>
    <nav style={tabs}><button onClick={() => navigate('/task-panel')} style={tab}>🗒 笔记</button><button style={{ ...tab, ...active }}>✦ 答题</button><button onClick={() => navigate('/wrong-book')} style={tab}>↺ 错题本</button></nav>
    <div style={{ textAlign: 'center', padding: '28px 12px' }}>
      <div style={{ fontSize: 56 }}>🐹</div>
      <h1 style={{ margin: '12px 0 8px' }}>噜噜答题屋</h1>
      <p style={{ color: '#a88a78', lineHeight: 1.6 }}>答题功能正在准备中，之后可以从你的笔记生成练习题。</p>
      <div style={card}><strong>功能框架已搭好</strong><p style={{ margin: '8px 0 0', color: '#a88a78' }}>题目、选项、解析和答题记录将显示在这里。</p></div>
    </div>
  </main>
}

const button: React.CSSProperties = { border: '1px solid #ecd8c4', background: '#fff', color: '#806654', borderRadius: 9, padding: '8px 12px' }
const tabs: React.CSSProperties = { display: 'flex', gap: 6, margin: '18px 0', padding: 4, background: 'rgba(255,255,255,.7)', border: '1px solid #f0dcc8', borderRadius: 13 }
const tab: React.CSSProperties = { flex: 1, padding: '9px 5px', borderRadius: 9, background: 'transparent', color: '#9c7d69', fontSize: 12 }
const active: React.CSSProperties = { background: '#f5b878', color: '#fff', fontWeight: 600 }
const card: React.CSSProperties = { margin: '28px auto', maxWidth: 300, padding: 18, background: 'rgba(255,255,255,.75)', border: '1px solid #f0dcc8', borderRadius: 16 }
