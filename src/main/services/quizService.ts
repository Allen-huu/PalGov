/**
 * 题库服务：读取 question-banks 目录下的 JSON 题库文件
 */
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { Question, QuestionBank, QuestionBankInfo, WrongQuestion, QuizProgress } from '@shared/types'
import { deleteQuizProgress, getWrongQuestions, listQuizProgress, removeWrongQuestion, saveQuizProgress, saveWrongQuestion } from './storeService'
import { getMySqlPool, queryOne, queryRows, execute } from './mysqlService'

/** 题库目录路径 */
export function getBanksDir(): string {
  if (process.env.ELECTRON_RENDERER_URL) {
    // 开发模式：项目 resources/question-banks
    return join(app.getAppPath(), 'resources', 'question-banks')
  }
  // 打包后：resources/question-banks（electron-builder 将 resources 内容平铺到 resourcesPath）
  return join(process.resourcesPath, 'question-banks')
}

/** 获取所有题库列表 */
export async function listQuestionBanks(): Promise<QuestionBankInfo[]> {
  if (await getMySqlPool()) {
    const rows = await queryRows<any[]>('SELECT file_name AS fileName,name,description,JSON_LENGTH(JSON_EXTRACT(payload, \'$.questions\')) AS questionCount FROM question_banks ORDER BY name')
    return rows.map((row) => ({ ...row, questionCount: Number(row.questionCount) })) as QuestionBankInfo[]
  }
  try {
    const dir = getBanksDir()
    const files = await readdir(dir)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))
    const result: QuestionBankInfo[] = []
    for (const file of jsonFiles) {
      try {
        const content = await readFile(join(dir, file), 'utf-8')
        const bank: QuestionBank = JSON.parse(content)
        result.push({
          fileName: file.replace('.json', ''),
          name: bank.name,
          description: bank.description,
          questionCount: bank.questions.length
        })
      } catch {
        // 跳过格式错误的文件
      }
    }
    return result
  } catch {
    return []
  }
}

/** 读取指定题库 */
export async function loadQuestionBank(fileName: string): Promise<QuestionBank | null> {
  if (await getMySqlPool()) {
    const row = await queryOne<any[]>('SELECT payload FROM question_banks WHERE file_name=?', [fileName])
    if (!row) return null
    return (typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload) as QuestionBank
  }
  try {
    const dir = getBanksDir()
    const content = await readFile(join(dir, `${fileName}.json`), 'utf-8')
    return JSON.parse(content) as QuestionBank
  } catch {
    return null
  }
}

export async function importQuestionBank(fileName: string, bank: QuestionBank): Promise<QuestionBankInfo> {
  const now = Date.now()
  if (await getMySqlPool()) {
    await execute('INSERT INTO question_banks (file_name,name,description,payload,created_at,updated_at) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),payload=VALUES(payload),updated_at=VALUES(updated_at)', [fileName, bank.name, bank.description ?? '', JSON.stringify(bank), now, now])
  } else throw new Error('请先绑定 MySQL，再导入题库')
  return { fileName, name: bank.name, description: bank.description ?? '', questionCount: bank.questions.length }
}

export async function renameQuestionBank(fileName: string, name: string): Promise<QuestionBankInfo | null> {
  const bank = await loadQuestionBank(fileName)
  if (!bank) return null
  const next = { ...bank, name: name.trim() || bank.name }
  if (await getMySqlPool()) {
    await execute('UPDATE question_banks SET name=?,payload=?,updated_at=? WHERE file_name=?', [next.name, JSON.stringify(next), Date.now(), fileName])
  } else throw new Error('请先绑定 MySQL，再重命名题库')
  return { fileName, name: next.name, description: next.description ?? '', questionCount: next.questions.length }
}

export async function deleteQuestionBank(fileName: string): Promise<boolean> {
  if (!fileName.trim()) return false
  if (!(await getMySqlPool())) throw new Error('请先绑定 MySQL，再删除题库')
  const existing = await queryOne<any[]>('SELECT file_name FROM question_banks WHERE file_name=?', [fileName])
  if (!existing) return false
  await execute('DELETE FROM question_banks WHERE file_name=?', [fileName])
  await execute('DELETE FROM quiz_progress WHERE bank_file_name=?', [fileName])
  await execute('DELETE FROM wrong_questions WHERE bank_file_name=?', [fileName])
  return true
}

export const getAllQuizProgress = () => listQuizProgress()
export const saveQuizProgressRecord = (progress: QuizProgress) => saveQuizProgress(progress)
export const deleteQuizProgressRecord = (fileName: string) => deleteQuizProgress(fileName)

// 艾宾浩斯记忆曲线间隔：10 分钟, 1 天, 2 天, 4 天, 7 天, 15 天, 30 天
export const REVIEW_INTERVALS = [10 * 60_000, 24 * 60 * 60_000, 2 * 24 * 60 * 60_000, 4 * 24 * 60 * 60_000, 7 * 24 * 60 * 60_000, 15 * 24 * 60 * 60_000, 30 * 24 * 60 * 60_000]

export async function addWrongQuestion(bankFileName: string, question: Question, userAnswer: number | number[] | string): Promise<WrongQuestion> {
  const now = Date.now()
  const id = `${bankFileName}:${question.id}`
  const existing = (await getWrongQuestions()).find((item) => item.id === id)
  return saveWrongQuestion({
    id, bankFileName, question, userAnswer,
    wrongCount: (existing?.wrongCount ?? 0) + 1,
    reviewStage: 0,
    lastReviewedAt: now,
    nextReviewAt: now + REVIEW_INTERVALS[0],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  })
}

export async function listWrongQuestions(): Promise<WrongQuestion[]> {
  return (await getWrongQuestions()).sort((a, b) => a.nextReviewAt - b.nextReviewAt)
}

export async function submitWrongReview(id: string, correct: boolean): Promise<WrongQuestion | null> {
  const item = (await getWrongQuestions()).find((question) => question.id === id)
  if (!item) return null

  const now = Date.now()
  if (correct && item.reviewStage >= REVIEW_INTERVALS.length - 1) {
    await removeWrongQuestion(id)
    return null
  }

  const reviewStage = correct ? item.reviewStage + 1 : 0
  return saveWrongQuestion({
    ...item,
    wrongCount: correct ? item.wrongCount : item.wrongCount + 1,
    reviewStage,
    lastReviewedAt: now,
    nextReviewAt: now + REVIEW_INTERVALS[reviewStage],
    updatedAt: now
  })
}
