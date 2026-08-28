import { ipcMain } from 'electron'
import { addWrongQuestion, listQuestionBanks, listWrongQuestions, loadQuestionBank, submitWrongReview } from '../services/quizService'
import { Question } from '@shared/types'

export function registerQuizIpc(): void {
  ipcMain.handle('quiz:listBanks', () => listQuestionBanks())
  ipcMain.handle('quiz:loadBank', (_evt, fileName: string) => loadQuestionBank(fileName))
  ipcMain.handle('quiz:addWrong', (_evt, payload: { bankFileName: string; question: Question; userAnswer: number | number[] | string }) =>
    addWrongQuestion(payload.bankFileName, payload.question, payload.userAnswer))
  ipcMain.handle('quiz:listWrong', () => listWrongQuestions())
  ipcMain.handle('quiz:submitWrongReview', (_evt, payload: { id: string; correct: boolean }) =>
    submitWrongReview(payload.id, payload.correct))
}
