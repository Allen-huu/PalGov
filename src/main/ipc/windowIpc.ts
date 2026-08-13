/**
 * 窗口相关 IPC handler
 */
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../config/constants'
import { dragPetWindow, getPetWindow, hidePetWindow, showPetWindow } from '../windows/petWindow'
import { hideTaskWindow, showTaskWindow, toggleTaskWindow } from '../windows/taskWindow'
import { showSettingsWindow } from '../windows/settingsWindow'

export function registerWindowIpc(): void {
  ipcMain.on(IPC_CHANNELS.SETTINGS_SHOW, () => showSettingsWindow())
  ipcMain.on(IPC_CHANNELS.PET_HIDE, () => hidePetWindow())
  ipcMain.on(IPC_CHANNELS.PET_SHOW, () => showPetWindow())
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
  })

  // 宠物动画事件：将渲染进程的动画触发转发到宠物窗口
  ipcMain.on(IPC_CHANNELS.PET_ANIM_EVENT, (_evt, args: { event: string }) => {
    const pet = getPetWindow()
    if (pet && !pet.isDestroyed()) {
      pet.webContents.send(IPC_CHANNELS.PET_ANIM_EVENT, args.event)
    }
  })
}
