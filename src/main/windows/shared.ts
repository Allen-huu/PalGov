/**
 * 共享窗口创建工具：提取三个窗口文件的公共逻辑
 */
import { BrowserWindow, shell } from 'electron'
import { join } from 'node:path'

type WindowKind = 'pet' | 'panel' | 'settings'

interface CreateWindowOptions {
  kind: WindowKind
  width: number
  height: number
  hash?: string
  extraOptions?: Partial<Electron.BrowserWindowConstructorOptions>
}

/** 创建窗口的通用工厂 */
export function createWindow(opts: CreateWindowOptions): BrowserWindow {
  const win = new BrowserWindow({
    width: opts.width,
    height: opts.height,
    frame: opts.kind === 'settings' ? true : false,
    transparent: opts.kind !== 'settings',
    resizable: false,
    alwaysOnTop: opts.kind !== 'settings',
    skipTaskbar: opts.kind !== 'settings',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    ...opts.extraOptions
  })

  // 加载页面
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}${opts.hash ? `#${opts.hash}` : ''}`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { hash: opts.hash })
  }

  // 外部链接用默认浏览器打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  return win
}