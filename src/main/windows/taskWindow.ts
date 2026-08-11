/**
 * 任务面板窗口：独立窗口，从宠物上方弹出
 */
import { BrowserWindow, screen, shell } from 'electron'
import { join } from 'node:path'
import { TASK_PANEL_SIZE } from '../config/constants'
import { getPetWindow } from './petWindow'

let taskWindow: BrowserWindow | null = null

/** 创建任务面板窗口 */
export function createTaskWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: TASK_PANEL_SIZE.width,
    height: TASK_PANEL_SIZE.height,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/task-panel`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'task-panel' })
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  taskWindow = win
  return win
}

/** 在宠物附近显示任务面板 */
export function showTaskWindow(): void {
  if (!taskWindow) {
    createTaskWindow()
  }
  const pet = getPetWindow()
  if (pet) {
    const [px, py] = pet.getPosition()
    const [, py2] = pet.getSize()
    // 在宠物上方显示
    taskWindow!.setPosition(px - 100, py - TASK_PANEL_SIZE.height - 10)
  } else {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    taskWindow!.setPosition(width - TASK_PANEL_SIZE.width - 40, height - TASK_PANEL_SIZE.height - 40)
  }
  taskWindow!.show()
  taskWindow!.focus()
}

/** 隐藏任务面板 */
export function hideTaskWindow(): void {
  taskWindow?.hide()
}

/** 切换任务面板显隐 */
export function toggleTaskWindow(): void {
  if (!taskWindow) {
    showTaskWindow()
    return
  }
  if (taskWindow.isVisible()) {
    hideTaskWindow()
  } else {
    showTaskWindow()
  }
}

/** 获取任务面板实例 */
export function getTaskWindow(): BrowserWindow | null {
  return taskWindow
}
