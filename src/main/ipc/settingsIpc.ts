import { ipcMain, app, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../config/constants'
import { getSettings, setSettings } from '../services/storeService'
import { applyShortcuts } from '../services/shortcutService'
import { restartDrinkReminder } from '../services/drinkReminderService'
import { restartStandReminder } from '../services/standReminderService'

export function registerSettingsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_evt, patch) => {
    const settings = await setSettings(patch)

    if (patch.autoStart !== undefined) {
      app.setLoginItemSettings({ openAtLogin: patch.autoStart })
    }

    if (patch.alwaysOnTop !== undefined) {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.setAlwaysOnTop(settings.alwaysOnTop)
      })
    }

    // 快捷键变更时重新注册
    if (patch.shortcuts) {
      applyShortcuts(patch.shortcuts)
    }

    // 喝水提醒间隔变更时重启
    if (patch.drinkReminderMinutes !== undefined) {
      restartDrinkReminder()
    }

    // 站立提醒间隔变更时重启
    if (patch.standReminderMinutes !== undefined) {
      restartStandReminder()
    }

    return settings
  })
}