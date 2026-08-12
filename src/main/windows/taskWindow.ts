/**
 * 任务面板窗口：从宠物上方弹出
 */
import { BrowserWindow, screen } from 'electron'
import { TASK_PANEL_SIZE } from '../config/constants'
import { createWindow } from './shared'
import { getPetWindow } from './petWindow'

let taskWindow: BrowserWindow | null = null

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
  if (pet) {
    const [px, py] = pet.getPosition()
    taskWindow!.setPosition(px - 20, py - TASK_PANEL_SIZE.height - 2)
  } else {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    taskWindow!.setPosition(width - TASK_PANEL_SIZE.width - 40, height - TASK_PANEL_SIZE.height - 40)
  }
  taskWindow!.show()
  taskWindow!.focus()
}

export function hideTaskWindow(): void {
  taskWindow?.hide()
}

export function toggleTaskWindow(): void {
  if (!taskWindow || !taskWindow.isVisible()) {
    showTaskWindow()
  } else {
    hideTaskWindow()
  }
}

export function getTaskWindow(): BrowserWindow | null {
  return taskWindow
}