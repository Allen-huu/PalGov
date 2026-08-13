/**
 * 题库服务：读取 question-banks 目录下的 JSON 题库文件
 */
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { QuestionBank, QuestionBankInfo } from '@shared/types'

/** 题库目录路径 */
function getBanksDir(): string {
  if (process.env.ELECTRON_RENDERER_URL) {
    // 开发模式：项目 resources/question-banks
    return join(app.getAppPath(), 'resources', 'question-banks')
  }
  // 打包后：resources/question-banks（electron-builder 将 resources 内容平铺到 resourcesPath）
  return join(process.resourcesPath, 'question-banks')
}

/** 获取所有题库列表 */
export async function listQuestionBanks(): Promise<QuestionBankInfo[]> {
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
  try {
    const dir = getBanksDir()
    const content = await readFile(join(dir, `${fileName}.json`), 'utf-8')
    return JSON.parse(content) as QuestionBank
  } catch {
    return null
  }
}