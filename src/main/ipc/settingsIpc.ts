/**
 * 设置相关 IPC handler
 */
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../config/constants'
import { getSettings, setSettings } from '../services/storeService'
import { Settings } from '@shared/types'

export function registerSettingsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_evt, patch: Partial<Settings>) => {
    const settings = await setSettings(patch)
    // 应用 alwaysOnTop 到所有窗口
    const { BrowserWindow } = require('electron')
    BrowserWindow.getAllWindows().forEach((win: Electron.BrowserWindow) => {
      win.setAlwaysOnTop(settings.alwaysOnTop)
    })
    return settings
  })
}
