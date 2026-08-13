/**
 * 主进程入口
 */
import { app, BrowserWindow } from 'electron'
import { APP_NAME } from './config/constants'
import { createPetWindow, showPetWindow } from './windows/petWindow'
import { createTaskWindow, getTaskWindow, scheduleBlurHide, cancelBlurTimer } from './windows/taskWindow'
import { registerTaskIpc } from './ipc/taskIpc'
import { registerSettingsIpc } from './ipc/settingsIpc'
import { registerWindowIpc } from './ipc/windowIpc'
import { registerAIIpc } from './ipc/aiIpc'
import { registerQuizIpc } from './ipc/quizIpc'
import { bindPetWindow, startNotifyService, stopNotifyService } from './services/notifyService'
import { createTray, destroyTray } from './services/trayService'
import { getSettings } from './services/storeService'
import { showSettingsWindow } from './windows/settingsWindow'
import { registerShortcuts, unregisterAllShortcuts } from './services/shortcutService'
import { startDrinkReminder, stopDrinkReminder } from './services/drinkReminderService'
import { startStandReminder, stopStandReminder } from './services/standReminderService'

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
  registerQuizIpc()

  // 创建窗口
  const pet = createPetWindow()
  if (!settings.petVisible) pet.hide()
  bindPetWindow(pet)
  createTaskWindow()

  // 任务面板失焦自动隐藏（toggle 会取消 blur 定时器避免冲突）
  const taskWin = getTaskWindow()
  if (taskWin) {
    taskWin.on('blur', () => scheduleBlurHide())
    taskWin.on('focus', () => cancelBlurTimer())
  }

  // 创建托盘
  createTray(() => showPetWindow(), () => showSettingsWindow(), () => {
    stopNotifyService()
    destroyTray()
  })

  // 启动提醒服务
  startNotifyService()

  // 启动喝水提醒
  startDrinkReminder()

  // 启动站立提醒
  startStandReminder()

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
  stopDrinkReminder()
  stopStandReminder()
  destroyTray()
  unregisterAllShortcuts()
})

app.on('will-quit', () => {
  unregisterAllShortcuts()
})
