/**
 * Preload 脚本：通过 contextBridge 暴露安全的 IPC API 给渲染进程
 */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { IPC_CHANNELS } from '../main/config/constants'
import { NotifyPayload, Settings, TaskInput, TaskUpdateInput } from '@shared/types'

const api = {
  /** 任务相关 */
  task: {
    list: (date?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TASK_LIST, date ? { date } : undefined) as Promise<
        import('@shared/types').Task[]
      >,
    create: (input: TaskInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.TASK_CREATE, input) as Promise<import('@shared/types').Task>,
    update: (payload: TaskUpdateInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.TASK_UPDATE, payload) as Promise<
        import('@shared/types').Task | null
      >,
    delete: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TASK_DELETE, { id }) as Promise<boolean>,
    toggleDone: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TASK_TOGGLE_DONE, { id }) as Promise<
        import('@shared/types').Task | null
      >,
    /** 监听到期提醒 */
    onNotify: (cb: (payload: NotifyPayload) => void) => {
      const handler = (_e: IpcRendererEvent, payload: NotifyPayload) => cb(payload)
      ipcRenderer.on(IPC_CHANNELS.NOTIFY_SHOW, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.NOTIFY_SHOW, handler)
    }
  },

  /** 窗口相关 */
  window: {
    drag: (dx: number, dy: number) => ipcRenderer.send(IPC_CHANNELS.WINDOW_DRAG, { dx, dy }),
    togglePanel: () => ipcRenderer.send(IPC_CHANNELS.PET_TOGGLE_PANEL),
    showPanel: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_SHOW_PANEL),
    hidePanel: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_HIDE_PANEL),
    quickAdd: () => ipcRenderer.send(IPC_CHANNELS.PET_QUICK_ADD),
    showSettings: () => ipcRenderer.send(IPC_CHANNELS.SETTINGS_SHOW),
    hidePet: () => ipcRenderer.send(IPC_CHANNELS.PET_HIDE),
    showPet: () => ipcRenderer.send(IPC_CHANNELS.PET_SHOW)
  },

  /** 设置相关 */
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET) as Promise<Settings>,
    set: (patch: Partial<Settings>) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, patch) as Promise<Settings>
  },

  /** AI 相关 */
  ai: {
    chat: (prompt: string, context?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT, { prompt, context }) as Promise<
        import('@shared/types').ChatResponse
      >,
    setKey: (apiKey: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_SET_KEY, apiKey) as Promise<Settings>,
    getStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_GET_STATUS) as Promise<{
        enabled: boolean
        hasKey: boolean
      }>,
    testConnection: () =>
      ipcRenderer.invoke('ai:testConnection') as Promise<{ ok: boolean; message: string }>
  },

  /** 应用信息 */
  app: {
    platform: process.platform
  }
}

export type PetApi = typeof api

contextBridge.exposeInMainWorld('pet', api)
