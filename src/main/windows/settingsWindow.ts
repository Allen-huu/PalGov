import { BrowserWindow } from 'electron'
import { SETTINGS_WINDOW_SIZE } from '../config/constants'
import { createWindow } from './shared'

let settingsWindow: BrowserWindow | null = null
export function createSettingsWindow(): BrowserWindow {
  const win = createWindow({ kind: 'settings', width: SETTINGS_WINDOW_SIZE.width, height: SETTINGS_WINDOW_SIZE.height, hash: '/settings', extraOptions: { title: '设置', autoHideMenuBar: true, resizable: true, minWidth: 520, minHeight: 680, backgroundColor: '#f5f2eb' } })
  settingsWindow = win
  win.on('closed', () => { settingsWindow = null })
  return win
}
export function showSettingsWindow(): void {
  if (!settingsWindow) createSettingsWindow()
  if (settingsWindow!.isMinimized()) settingsWindow!.restore()
  settingsWindow!.show(); settingsWindow!.focus()
}
