/**
 * 题库 IPC handler
 */
import { ipcMain } from 'electron'
import { listQuestionBanks, loadQuestionBank } from '../services/quizService'

export function registerQuizIpc(): void {
  ipcMain.handle('quiz:listBanks', async () => {
    return listQuestionBanks()
  })

  ipcMain.handle('quiz:loadBank', async (_evt, fileName: string) => {
    return loadQuestionBank(fileName)
  })
}