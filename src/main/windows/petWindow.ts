/**
 * 宠物窗口管理
 */
import { BrowserWindow, screen, shell } from 'electron'
import { join } from 'node:path'
import { PET_WINDOW_SIZE } from '../config/constants'
import { getSettingsSync, setSettings } from '../services/storeService'
import { showSettingsWindow } from './settingsWindow'

let petWindow: BrowserWindow | null = null

/** 获取所有显示器的合并边界 */
function getDisplayBounds() {
  const displays = screen.getAllDisplays()
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const d of displays) {
    const b = d.workArea
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.width)
    maxY = Math.max(maxY, b.y + b.height)
  }
  return { minX, minY, maxX, maxY }
}

/** 将坐标限制在所有显示器工作区内 */
export function clampPosition(x: number, y: number): { x: number; y: number } {
  const { minX, minY, maxX, maxY } = getDisplayBounds()
  const clampedX = Math.max(minX, Math.min(maxX - PET_WINDOW_SIZE.width, x))
  const clampedY = Math.max(minY, Math.min(maxY - PET_WINDOW_SIZE.height, y))
  return { x: clampedX, y: clampedY }
}

/** 创建宠物透明置顶窗口 */
export function createPetWindow(): BrowserWindow {
  const settings = getSettingsSync()

  // 默认位置：主显示器右下角
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  let x = screenWidth - PET_WINDOW_SIZE.width - 40
  let y = screenHeight - PET_WINDOW_SIZE.height - 40

  // 如果有保存的位置，使用保存的位置
  if (settings.petPosition) {
    const clamped = clampPosition(settings.petPosition.x, settings.petPosition.y)
    x = clamped.x
    y = clamped.y
  }

  const win = new BrowserWindow({
    width: PET_WINDOW_SIZE.width,
    height: PET_WINDOW_SIZE.height,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.once('ready-to-show', () => {
    win.show()
  })

  win.webContents.on('will-navigate', (e) => e.preventDefault())
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // 窗口移动时保存位置
  win.on('move', () => {
    const [wx, wy] = win.getPosition()
    setSettings({ petPosition: { x: wx, y: wy } })
  })

  petWindow = win
  return win
}

/** 获取宠物窗口实例 */
export function getPetWindow(): BrowserWindow | null {
  return petWindow
}

/** 移动宠物位置（相对偏移），带边界限制 */
export function dragPetWindow(dx: number, dy: number): void {
  if (!petWindow) return
  const [x, y] = petWindow.getPosition()
  const clamped = clampPosition(x + dx, y + dy)
  petWindow.setPosition(clamped.x, clamped.y)
}

/** 直接设置宠物位置，带边界限制 */
export function setPetPosition(x: number, y: number): void {
  if (!petWindow) return
  const clamped = clampPosition(x, y)
  petWindow.setPosition(clamped.x, clamped.y)
}

/** 显隐宠物 */
export function showPetWindow(): void {
  petWindow?.show()
  petWindow?.focus()
}

/** 显示设置窗口 */
export function showPetSettingsWindow(): void {
  showSettingsWindow()
}
