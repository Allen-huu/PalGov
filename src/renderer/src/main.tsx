import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Route } from './router'
import { PetPage } from './pages/Pet'
import { TaskPanelPage } from './pages/TaskPanel'
import { SettingsPage } from './pages/Settings'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Route path="/" element={<PetPage />} />
      <Route path="/task-panel" element={<TaskPanelPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </HashRouter>
  </React.StrictMode>
)