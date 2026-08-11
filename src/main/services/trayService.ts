/**
 * 托盘服务：系统托盘图标 + 右键菜单
 */
import { Menu, Tray, app, nativeImage } from 'electron'
import { join } from 'node:path'
import { APP_NAME } from '../config/constants'

let tray: Tray | null = null

/** 创建托盘 */
export function createTray(onShowPet: () => void, onQuit: () => void): Tray {
  // 开发环境无图标时使用 1x1 透明占位
  let icon = nativeImage.createFromPath(join(__dirname, '../../resources/tray-icon.png'))
  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip(APP_NAME)

  const menu = Menu.buildFromTemplate([
    { label: APP_NAME, enabled: false },
    { type: 'separator' },
    {
      label: '显示宠物',
      click: () => onShowPet()
    },
    {
      label: '退出',
      click: () => {
        onQuit()
        app.quit()
      }
    }
  ])

  tray.setContextMenu(menu)
  tray.on('click', () => onShowPet())

  return tray
}

/** 销毁托盘 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
