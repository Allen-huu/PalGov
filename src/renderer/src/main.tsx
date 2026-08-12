import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Route } from './router'
import { PetPage } from './pages/Pet'
import { TaskPanelPage } from './pages/TaskPanel'
import { SettingsPage } from './pages/Settings'
import { QuizPage } from './pages/Quiz'
import { WrongBookPage } from './pages/WrongBook'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Route path="/" element={<PetPage />} />
      <Route path="/task-panel" element={<TaskPanelPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/quiz" element={<QuizPage />} />
      <Route path="/wrong-book" element={<WrongBookPage />} />
      <Route path="*" element={<RouteFallback />} />
    </HashRouter>
  </React.StrictMode>
)

function RouteFallback() {
  return <div style={{ padding: 32, color: '#fff', background: '#1f2028', height: '100%' }}>页面加载失败，请关闭窗口后从托盘重新打开设置。</div>
}
