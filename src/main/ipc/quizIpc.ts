import { ipcMain, dialog } from 'electron'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { addWrongQuestion, deleteQuestionBank, deleteQuizProgressRecord, getAllQuizProgress, importQuestionBank, listQuestionBanks, listWrongQuestions, loadQuestionBank, renameQuestionBank, saveQuizProgressRecord, submitWrongReview } from '../services/quizService'
import { Question, QuestionBank } from '@shared/types'

export function registerQuizIpc(): void {
  ipcMain.handle('quiz:listBanks', () => listQuestionBanks())
  ipcMain.handle('quiz:loadBank', (_evt, fileName: string) => loadQuestionBank(fileName))
  ipcMain.handle('quiz:listProgress', () => getAllQuizProgress())
  ipcMain.handle('quiz:saveProgress', (_evt, progress) => saveQuizProgressRecord(progress))
  ipcMain.handle('quiz:deleteProgress', (_evt, fileName: string) => deleteQuizProgressRecord(fileName))
  ipcMain.handle('quiz:renameBank', (_evt, payload: { fileName: string; name: string }) => renameQuestionBank(payload.fileName, payload.name))
  ipcMain.handle('quiz:deleteBank', (_evt, fileName: string) => deleteQuestionBank(fileName))
  ipcMain.handle('quiz:importBank', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'JSON 题库', extensions: ['json'] }] })
    if (result.canceled || !result.filePaths[0]) return null
    const filePath = result.filePaths[0]
    const bank = JSON.parse(await readFile(filePath, 'utf8')) as QuestionBank
    if (!bank.name || !Array.isArray(bank.questions)) throw new Error('题库格式无效')
    const fileName = basename(filePath, '.json').replace(/[^\w\-\u4e00-\u9fff]+/g, '_').slice(0, 180)
    return importQuestionBank(fileName, bank)
  })
  ipcMain.handle('quiz:addWrong', (_evt, payload: { bankFileName: string; question: Question; userAnswer: number | number[] | string }) =>
    addWrongQuestion(payload.bankFileName, payload.question, payload.userAnswer))
  ipcMain.handle('quiz:listWrong', () => listWrongQuestions())
  ipcMain.handle('quiz:submitWrongReview', (_evt, payload: { id: string; correct: boolean }) =>
    submitWrongReview(payload.id, payload.correct))
}
