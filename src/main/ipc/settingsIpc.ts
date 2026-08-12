import { ipcMain, app } from 'electron'
import { IPC_CHANNELS } from '../config/constants'
import { getSettings, setSettings } from '../services/storeService'
import { validateSettingsPatch } from '../utils/validate'

export function registerSettingsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_evt, patch: unknown) => {
    const valid = validateSettingsPatch(patch)
    if (!valid) throw new Error('无效的设置输入')

    if (typeof valid.autoStart === 'boolean') {
      app.setLoginItemSettings({ openAtLogin: valid.autoStart })
    }

    const settings = await setSettings(valid as Parameters<typeof setSettings>[0])

    if (typeof settings.alwaysOnTop === 'boolean') {
      const { BrowserWindow } = require('electron')
      BrowserWindow.getAllWindows().forEach((win: Electron.BrowserWindow) => {
        win.setAlwaysOnTop(settings.alwaysOnTop)
      })
    }

    return settings
  })
}
