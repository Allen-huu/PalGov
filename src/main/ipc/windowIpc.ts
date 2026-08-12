/**
 * 窗口相关 IPC handler
 */
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../config/constants'
import { dragPetWindow, hidePetWindow, showPetWindow } from '../windows/petWindow'
import { hideTaskWindow, showTaskWindow, toggleTaskWindow } from '../windows/taskWindow'
import { showSettingsWindow } from '../windows/settingsWindow'

export function registerWindowIpc(): void {
  ipcMain.on(IPC_CHANNELS.SETTINGS_SHOW, () => showSettingsWindow())
  ipcMain.on(IPC_CHANNELS.PET_HIDE, () => hidePetWindow())
  // 拖拽宠物
  ipcMain.on(IPC_CHANNELS.WINDOW_DRAG, (_evt, args: { dx: number; dy: number }) => {
    dragPetWindow(args.dx, args.dy)
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

  // 快速添加任务：弹出任务面板并聚焦到输入框
  ipcMain.on(IPC_CHANNELS.PET_QUICK_ADD, () => {
    showTaskWindow()
    // 渲染进程会监听窗口显示事件，并在 URL hash 中处理 focus
  })

  // 失焦隐藏任务面板
  // 注意：在 taskWindow.ts 的 ready-to-show 中绑定 blur 事件
}
