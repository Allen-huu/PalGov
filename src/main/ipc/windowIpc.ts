/**
 * 窗口相关 IPC handler
 */
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../config/constants'
import { dragPetWindow, setPetPosition } from '../windows/petWindow'
import { hideTaskWindow, showTaskWindow, toggleTaskWindow } from '../windows/taskWindow'
import { showSettingsWindow } from '../windows/settingsWindow'
import { setSettings } from '../services/storeService'

export function registerWindowIpc(): void {
  // 拖拽宠物
  ipcMain.on(IPC_CHANNELS.WINDOW_DRAG, (_evt, args: { dx: number; dy: number }) => {
    dragPetWindow(args.dx, args.dy)
  })

  // 保存宠物位置
  ipcMain.on(IPC_CHANNELS.PET_POSITION_SAVE, (_evt, args: { x: number; y: number }) => {
    setPetPosition(args.x, args.y)
    setSettings({ petPosition: { x: args.x, y: args.y } })
  })

  // 显隐任务面板
  ipcMain.on(IPC_CHANNELS.PET_TOGGLE_PANEL, () => {
    toggleTaskWindow()
  })

  ipcMain.on(IPC_CHANNELS.WINDOW_SHOW_PANEL, () => {
    showTaskWindow()
  })

  ipcMain.on(IPC_CHANNELS.WINDOW_HIDE_PANEL, () => {
    hideTaskWindow()
  })

  // 显示设置窗口
  ipcMain.on(IPC_CHANNELS.WINDOW_SHOW_SETTINGS, () => {
    showSettingsWindow()
  })

  // 快速添加任务：弹出任务面板
  ipcMain.on(IPC_CHANNELS.PET_QUICK_ADD, () => {
    showTaskWindow()
  })
}
