import React from 'react'
import { useRouter } from '../router'

export const WrongBookPage: React.FC = () => {
  const { navigate } = useRouter()
  return <main style={styles.page}>
    <header style={styles.header}>
      <button onClick={() => navigate('/task-panel')} style={styles.back}>←</button>
      <div><div style={styles.eyebrow}>噜噜的学习角</div><h1 style={styles.title}>错题本</h1></div>
      <div style={styles.count}>0 题</div>
    </header>
    <nav style={styles.tabs}>
      <button onClick={() => navigate('/task-panel')} style={styles.tab}>🗒 笔记</button>
      <button onClick={() => navigate('/quiz')} style={styles.tab}>✦ 答题</button>
      <button style={{ ...styles.tab, ...styles.active }}>↺ 错题本</button>
    </nav>
    <section style={styles.empty}>
      <div style={styles.emoji}>🌱</div>
      <h2 style={styles.emptyTitle}>错题本还很干净</h2>
      <p style={styles.desc}>答题后答错的题目会自动收集到这里，方便你之后复习。</p>
      <button onClick={() => navigate('/quiz')} style={styles.primary}>去答题</button>
    </section>
  </main>
}

const styles: Record<string, React.CSSProperties> = {
  page: { width: '100%', height: '100%', padding: 18, background: 'linear-gradient(160deg,#fff9f0,#fff0db)', color: '#674c3d', overflowY: 'auto' },
  header: { display: 'flex', alignItems: 'center', gap: 12 }, back: { width: 32, height: 32, borderRadius: 10, background: '#fff', color: '#8c6d59', fontSize: 18 },
  eyebrow: { color: '#b59680', fontSize: 11 }, title: { margin: '2px 0 0', fontSize: 22, color: '#704d39' }, count: { marginLeft: 'auto', color: '#b59680', fontSize: 12 },
  tabs: { display: 'flex', gap: 6, margin: '18px 0', padding: 4, background: 'rgba(255,255,255,.7)', border: '1px solid #f0dcc8', borderRadius: 13 },
  tab: { flex: 1, padding: '9px 5px', borderRadius: 9, background: 'transparent', color: '#9c7d69', fontSize: 12 }, active: { background: '#f5b878', color: '#fff', fontWeight: 600 },
  empty: { marginTop: 30, padding: '38px 24px', textAlign: 'center', background: 'rgba(255,255,255,.68)', border: '1px solid #f0dcc8', borderRadius: 18 }, emoji: { fontSize: 48 }, emptyTitle: { margin: '12px 0 8px', fontSize: 17 }, desc: { color: '#a98c78', fontSize: 12, lineHeight: 1.7 }, primary: { marginTop: 18, padding: '9px 20px', borderRadius: 10, background: '#f2aa63', color: '#fff', fontWeight: 600 }
}
