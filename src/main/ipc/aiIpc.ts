import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../config/constants'
import { chatWithAI, setApiKey, getAIStatus, testConnection } from '../services/aiService'

export function registerAIIpc(): void {
  ipcMain.handle(IPC_CHANNELS.AI_CHAT, async (_evt, input: { prompt: string; context?: string }) => {
    return chatWithAI(input)
  })

  ipcMain.handle(IPC_CHANNELS.AI_SET_KEY, async (_evt, apiKey: string) => {
    return setApiKey(apiKey)
  })

  ipcMain.handle(IPC_CHANNELS.AI_GET_STATUS, async () => {
    return getAIStatus()
  })

  ipcMain.handle('ai:testConnection', async () => {
    return testConnection()
  })
}