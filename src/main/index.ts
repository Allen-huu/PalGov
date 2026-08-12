/**
 * 主进程入口
 */
import { app, BrowserWindow } from 'electron'
import { APP_NAME } from './config/constants'
import { createPetWindow, showPetWindow } from './windows/petWindow'
import { createTaskWindow, getTaskWindow, hideTaskWindow } from './windows/taskWindow'
import { registerTaskIpc } from './ipc/taskIpc'
import { registerSettingsIpc } from './ipc/settingsIpc'
import { registerWindowIpc } from './ipc/windowIpc'
import { registerAIIpc } from './ipc/aiIpc'
import { bindPetWindow, startNotifyService, stopNotifyService } from './services/notifyService'
import { createTray, destroyTray } from './services/trayService'
import { getSettings } from './services/storeService'
import { showSettingsWindow } from './windows/settingsWindow'
import { registerShortcuts, unregisterAllShortcuts } from './services/shortcutService'

// 禁用硬件加速在某些显卡下能让透明窗口更稳定（按需）
// app.disableHardwareAcceleration()

// 单实例锁
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

app.on('second-instance', () => {
  showPetWindow()
})

app.whenReady().then(async () => {
  // 应用设置：开机自启
  const settings = await getSettings()
  app.setLoginItemSettings({
    openAtLogin: settings.autoStart
  })

  // 注册所有 IPC handler
  registerTaskIpc()
  registerSettingsIpc()
  registerWindowIpc()
  registerAIIpc()

  // 创建窗口
  const pet = createPetWindow()
  if (!settings.petVisible) pet.hide()
  bindPetWindow(pet)
  createTaskWindow()

  // 任务面板失焦自动隐藏（延迟 150ms，让宠物点击切换有机会先执行）
  const taskWin = getTaskWindow()
  if (taskWin) {
    let blurTimer: ReturnType<typeof setTimeout> | null = null
    taskWin.on('blur', () => {
      blurTimer = setTimeout(() => {
        if (taskWin && !taskWin.isFocused() && !taskWin.isDestroyed()) {
          hideTaskWindow()
        }
      }, 150)
    })
    taskWin.on('focus', () => {
      if (blurTimer) { clearTimeout(blurTimer); blurTimer = null }
    })
  }

  // 创建托盘
  createTray(() => showPetWindow(), () => showSettingsWindow(), () => {
    stopNotifyService()
    destroyTray()
  })

  // 启动提醒服务
  startNotifyService()

  // 根据设置注册全局快捷键
  registerShortcuts()

  // macOS 隐藏 dock 图标（桌面宠物风格）
  if (process.platform === 'darwin') {
    app.dock?.hide()
  }

  console.log(`[${APP_NAME}] started`)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    showPetWindow()
  }
})

app.on('before-quit', async () => {
  stopNotifyService()
  destroyTray()
  unregisterAllShortcuts()
})

app.on('will-quit', () => {
  unregisterAllShortcuts()
})
