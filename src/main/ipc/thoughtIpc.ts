import { ipcMain } from 'electron'
import { archiveThought, createThought, importThoughtFile, listThoughts, summarizeThought } from '../services/thoughtService'
import { dialog } from 'electron'

export function registerThoughtIpc(): void {
  ipcMain.handle('thought:list', () => listThoughts())
  ipcMain.handle('thought:create', (_event, rawText: string) => createThought(rawText))
  ipcMain.handle('thought:summarize', (_event, id: string) => summarizeThought(id))
  ipcMain.handle('thought:archive', (_event, id: string) => archiveThought(id))
  ipcMain.handle('thought:importFile', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: '文本或 Markdown', extensions: ['txt', 'md'] }] })
    if (result.canceled || !result.filePaths[0]) return []
    return importThoughtFile(result.filePaths[0])
  })
}
