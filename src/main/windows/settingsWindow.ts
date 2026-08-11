/**
 * 设置窗口
 */
import { BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { SETTINGS_WINDOW_SIZE } from '../config/constants'

let settingsWindow: BrowserWindow | null = null

export function createSettingsWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: SETTINGS_WINDOW_SIZE.width,
    height: SETTINGS_WINDOW_SIZE.height,
    title: '设置',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/settings`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'settings' })
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  settingsWindow = win
  return win
}

export function showSettingsWindow(): void {
  if (!settingsWindow) {
    createSettingsWindow()
  }
  settingsWindow!.show()
  settingsWindow!.focus()
}
