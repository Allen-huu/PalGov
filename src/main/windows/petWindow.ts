/**
 * 宠物窗口管理
 */
import { BrowserWindow, screen, shell } from 'electron'
import { join } from 'node:path'
import { PET_WINDOW_SIZE } from '../config/constants'

let petWindow: BrowserWindow | null = null

/** 创建宠物透明置顶窗口 */
export function createPetWindow(): BrowserWindow {
  // 默认位置：主显示器右下角
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  const x = screenWidth - PET_WINDOW_SIZE.width - 40
  const y = screenHeight - PET_WINDOW_SIZE.height - 40

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

  // 开发环境打开 devtools
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
    // 透明窗口 devtools 容易影响交互，手动按需打开
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.once('ready-to-show', () => {
    win.show()
  })

  // 屏蔽内部右键菜单
  win.webContents.on('will-navigate', (e) => e.preventDefault())
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  petWindow = win
  return win
}

/** 获取宠物窗口实例 */
export function getPetWindow(): BrowserWindow | null {
  return petWindow
}

/** 移动宠物位置（相对偏移） */
export function dragPetWindow(dx: number, dy: number): void {
  if (!petWindow) return
  const [x, y] = petWindow.getPosition()
  petWindow.setPosition(x + dx, y + dy)
}

/** 显隐宠物 */
export function showPetWindow(): void {
  petWindow?.show()
  petWindow?.focus()
}
