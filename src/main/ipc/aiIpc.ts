import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../config/constants'
import { chatWithAI, setApiKey, getAIStatus, testConnection } from '../services/aiService'
import { validateChatInput } from '../utils/validate'

export function registerAIIpc(): void {
  ipcMain.handle(IPC_CHANNELS.AI_CHAT, async (_evt, input: unknown) => {
    const valid = validateChatInput(input)
    if (!valid) throw new Error('无效的输入参数')
    return chatWithAI({ prompt: valid.prompt, context: valid.context })
  })

  ipcMain.handle(IPC_CHANNELS.AI_SET_KEY, async (_evt, apiKey: unknown) => {
    if (typeof apiKey !== 'string') throw new Error('无效的 API Key')
    const trimmed = apiKey.trim()
    if (trimmed.length > 200) throw new Error('API Key 过长')
    return setApiKey(trimmed)
  })

  ipcMain.handle(IPC_CHANNELS.AI_GET_STATUS, async () => {
    return getAIStatus()
  })

  ipcMain.handle('ai:testConnection', async () => {
    return testConnection()
  })
}
