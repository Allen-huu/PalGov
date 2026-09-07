import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { NotifyPayload, Settings, TaskInput, TaskUpdateInput, Question, QuestionBankInfo, QuestionBank, WrongQuestion, BiliUp, BiliDynamic, BiliAddResult } from '@shared/types'

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
    onNotify: (cb: (payload: NotifyPayload) => void) => {
      const handler = (_e: IpcRendererEvent, payload: NotifyPayload) => cb(payload)
      ipcRenderer.on(IPC_CHANNELS.NOTIFY_SHOW, handler)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.NOTIFY_SHOW, handler)
      }
    }
  },

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

  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET) as Promise<Settings>,
    set: (patch: Partial<Settings>) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, patch) as Promise<Settings>
  },

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

  app: {
    platform: process.platform
  },

  quiz: {
    listBanks: () =>
      ipcRenderer.invoke('quiz:listBanks') as Promise<QuestionBankInfo[]>,
    loadBank: (fileName: string) =>
      ipcRenderer.invoke('quiz:loadBank', fileName) as Promise<QuestionBank | null>,
    addWrong: (bankFileName: string, question: Question, userAnswer: number | number[] | string) =>
      ipcRenderer.invoke('quiz:addWrong', { bankFileName, question, userAnswer }) as Promise<WrongQuestion>,
    listWrong: () => ipcRenderer.invoke('quiz:listWrong') as Promise<WrongQuestion[]>,
    submitWrongReview: (id: string, correct: boolean) =>
      ipcRenderer.invoke('quiz:submitWrongReview', { id, correct }) as Promise<WrongQuestion | null>
  },

  bili: {
    addUp: (input: string) =>
      ipcRenderer.invoke('bili:addUp', input) as Promise<BiliAddResult>,
    removeUp: (mid: number) =>
      ipcRenderer.invoke('bili:removeUp', { mid }) as Promise<boolean>,
    listUps: () => ipcRenderer.invoke('bili:listUps') as Promise<BiliUp[]>,
    listDynamics: () => ipcRenderer.invoke('bili:listDynamics') as Promise<BiliDynamic[]>,
    refreshNow: () => ipcRenderer.invoke('bili:refreshNow') as Promise<void>,
    status: () =>
      ipcRenderer.invoke('bili:getStatus') as Promise<{
        lastError: string | null
        lastPollAt: number | null
        nextPollAt: number | null
      }>,
    onUpdate: (cb: (fresh: BiliDynamic[]) => void) => {
      const handler = (_e: IpcRendererEvent, fresh: BiliDynamic[]) => cb(fresh)
      ipcRenderer.on(IPC_CHANNELS.BILI_UPDATE, handler)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.BILI_UPDATE, handler)
      }
    }
  },

  anim: {
    sendQuizEvent: (event: 'correct' | 'wrong') =>
      ipcRenderer.send(IPC_CHANNELS.PET_ANIM_EVENT, { event }),
    onQuizEvent: (cb: (event: string) => void) => {
      const handler = (_e: IpcRendererEvent, event: string) => cb(event)
      ipcRenderer.on(IPC_CHANNELS.PET_ANIM_EVENT, handler)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.PET_ANIM_EVENT, handler)
      }
    },
    onSpeech: (cb: (message: string) => void) => {
      const handler = (_e: IpcRendererEvent, message: string) => cb(message)
      ipcRenderer.on(IPC_CHANNELS.PET_SPEECH, handler)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.PET_SPEECH, handler)
      }
    }
  }
}

export type PetApi = typeof api

contextBridge.exposeInMainWorld('pet', api)
