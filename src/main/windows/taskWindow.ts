/**
 * 任务面板窗口：从宠物上方弹出
 */
import { BrowserWindow, screen } from 'electron'
import { TASK_PANEL_SIZE, PET_WINDOW_SIZE } from '../config/constants'
import { createWindow } from './shared'
import { getPetWindow } from './petWindow'

let taskWindow: BrowserWindow | null = null
let blurTimer: ReturnType<typeof setTimeout> | null = null

export function createTaskWindow(): BrowserWindow {
  const win = createWindow({
    kind: 'panel',
    width: TASK_PANEL_SIZE.width,
    height: TASK_PANEL_SIZE.height,
    hash: 'task-panel'
  })
  taskWindow = win
  return win
}

export function showTaskWindow(): void {
  if (!taskWindow) createTaskWindow()
  const pet = getPetWindow()
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  if (pet) {
    const [px, py] = pet.getPosition()
    const pw = PET_WINDOW_SIZE.width
    const ph = PET_WINDOW_SIZE.height
    // 面板居中对齐宠物，紧贴上方
    let x = px + pw / 2 - TASK_PANEL_SIZE.width / 2
    let y = py - TASK_PANEL_SIZE.height - 2
    // 边界检测
    if (x < 0) x = 2
    if (x + TASK_PANEL_SIZE.width > sw) x = sw - TASK_PANEL_SIZE.width - 2
    if (y < 0) y = py + ph + 2 // 上方不够，放下方
    if (y + TASK_PANEL_SIZE.height > sh) y = sh - TASK_PANEL_SIZE.height - 2
    taskWindow!.setPosition(Math.round(x), Math.round(y))
  } else {
    taskWindow!.setPosition(sw - TASK_PANEL_SIZE.width - 40, sh - TASK_PANEL_SIZE.height - 40)
  }
  taskWindow!.show()
  taskWindow!.focus()
}

export function hideTaskWindow(): void {
  cancelBlurTimer()
  taskWindow?.hide()
}

export function toggleTaskWindow(): void {
  cancelBlurTimer()
  if (!taskWindow || !taskWindow.isVisible()) {
    showTaskWindow()
  } else {
    hideTaskWindow()
  }
}

export function getTaskWindow(): BrowserWindow | null {
  return taskWindow
}

export function scheduleBlurHide(): void {
  cancelBlurTimer()
  blurTimer = setTimeout(() => {
    if (taskWindow && !taskWindow.isFocused() && !taskWindow.isDestroyed()) {
      hideTaskWindow()
    }
  }, 200)
}

export function cancelBlurTimer(): void {
  if (blurTimer) { clearTimeout(blurTimer); blurTimer = null }
}