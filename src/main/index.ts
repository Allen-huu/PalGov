/**
 * 主进程入口
 */
import { app, BrowserWindow, globalShortcut } from 'electron'
import { APP_NAME } from './config/constants'
import { createPetWindow, showPetWindow } from './windows/petWindow'
import { createTaskWindow, getTaskWindow, hideTaskWindow } from './windows/taskWindow'
import { registerTaskIpc } from './ipc/taskIpc'
import { registerSettingsIpc } from './ipc/settingsIpc'
import { registerWindowIpc } from './ipc/windowIpc'
import { registerAnimationIpc, registerAnimationProtocol } from './ipc/animationIpc'
import { bindPetWindow, startNotifyService, stopNotifyService } from './services/notifyService'
import { createTray, destroyTray } from './services/trayService'
import { getSettings } from './services/storeService'
import { extractAllAnimations } from './services/animationService'

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
  // 先加载设置（用于后续同步访问）
  await getSettings()

  // 解压 ZIP 动画包到 userData 目录
  try {
    await extractAllAnimations()
  } catch (e) {
    console.error('[Animation] 解压动画包失败:', e)
  }

  // 注册自定义协议 pet:// 用于安全提供帧文件
  registerAnimationProtocol()

  // 注册所有 IPC handler
  registerTaskIpc()
  registerSettingsIpc()
  registerWindowIpc()
  registerAnimationIpc()

  // 创建窗口
  const pet = createPetWindow()
  bindPetWindow(pet)
  createTaskWindow()

  // 任务面板失焦自动隐藏
  const taskWin = getTaskWindow()
  if (taskWin) {
    taskWin.on('blur', () => hideTaskWindow())
  }

  // 创建托盘
  createTray(() => showPetWindow(), () => {
    stopNotifyService()
    destroyTray()
  })

  // 启动提醒服务
  startNotifyService()

  // 全局快捷键：Ctrl+Shift+P 显示宠物
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    showPetWindow()
  })

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
  globalShortcut.unregisterAll()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
