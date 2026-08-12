import { Menu, Tray, app, nativeImage } from 'electron'
import { join } from 'node:path'
import { APP_NAME } from '../config/constants'

let tray: Tray | null = null

export function createTray(onShowPet: () => void, onShowSettings: () => void, onQuit: () => void): Tray {
  let icon = nativeImage.createFromPath(join(__dirname, '../../resources/tray-icon.png'))
  if (icon.isEmpty()) icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip(APP_NAME)
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: APP_NAME, enabled: false },
    { type: 'separator' },
    { label: '显示宠物', click: onShowPet },
    { label: '设置', click: onShowSettings },
    { type: 'separator' },
    { label: '退出', click: () => { onQuit(); app.quit() } }
  ]))
  tray.on('click', onShowPet)
  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
