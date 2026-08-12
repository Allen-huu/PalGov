/**
 * 宠物窗口：透明置顶，桌面右下角
 */
import { BrowserWindow, screen } from 'electron'
import { PET_WINDOW_SIZE } from '../config/constants'
import { createWindow } from './shared'

let petWindow: BrowserWindow | null = null

export function createPetWindow(): BrowserWindow {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  const win = createWindow({
    kind: 'pet',
    width: PET_WINDOW_SIZE.width,
    height: PET_WINDOW_SIZE.height,
    extraOptions: {
      x: sw - PET_WINDOW_SIZE.width - 40,
      y: sh - PET_WINDOW_SIZE.height - 40,
      hasShadow: false,
      maximizable: false,
      minimizable: false
    }
  })

  win.once('ready-to-show', () => win.show())
  win.webContents.on('will-navigate', (e) => e.preventDefault())

  petWindow = win
  return win
}

export function getPetWindow(): BrowserWindow | null {
  return petWindow
}

export function dragPetWindow(dx: number, dy: number): void {
  if (!petWindow) return
  const [x, y] = petWindow.getPosition()
  petWindow.setPosition(x + dx, y + dy)
}

export function showPetWindow(): void {
  petWindow?.show()
  petWindow?.focus()
}

export function hidePetWindow(): void {
  petWindow?.hide()
}
