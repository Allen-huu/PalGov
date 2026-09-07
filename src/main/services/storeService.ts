/**
 * lowdb 封装：负责本地 JSON 数据持久化
 */
import { app } from 'electron'
import { join } from 'node:path'
import { JSONFilePreset } from 'lowdb/node'
import { DB_FILE_NAME } from '../config/constants'
import { DEFAULT_SETTINGS, Settings, Task, WrongQuestion, BiliUp, BiliDynamic } from '@shared/types'

/** 数据库结构 */
export interface DbSchema {
  tasks: Task[]
  settings: Settings
  wrongQuestions: WrongQuestion[]
  biliUps: BiliUp[]
  biliDynamics: BiliDynamic[]
}

/** 默认数据 */
const defaultData: DbSchema = {
  tasks: [],
  settings: { ...DEFAULT_SETTINGS },
  wrongQuestions: [],
  biliUps: [],
  biliDynamics: []
}

let dbPromise: ReturnType<typeof JSONFilePreset<DbSchema>> | null = null

/** 获取 db 文件路径 */
function getDbPath(): string {
  return join(app.getPath('userData'), DB_FILE_NAME)
}

/** 初始化数据库（懒加载单例） */
async function getDb() {
  if (!dbPromise) {
    const instance = await JSONFilePreset<DbSchema>(getDbPath(), defaultData)
    // 兼容旧数据：若字段缺失则补默认值
    instance.data.settings = { ...DEFAULT_SETTINGS, ...(instance.data.settings ?? {}) }
    if (!Array.isArray(instance.data.tasks)) {
      instance.data.tasks = []
    }
    if (!Array.isArray(instance.data.wrongQuestions)) {
      instance.data.wrongQuestions = []
    }
    if (!Array.isArray(instance.data.biliUps)) {
      instance.data.biliUps = []
    }
    if (!Array.isArray(instance.data.biliDynamics)) {
      instance.data.biliDynamics = []
    }
    await instance.write()
    dbPromise = Promise.resolve(instance)
  }
  return dbPromise
}

/** 获取所有任务 */
export async function getAllTasks(): Promise<Task[]> {
  const db = await getDb()
  return [...db.data.tasks]
}

/** 获取指定日期任务 */
export async function getTasksByDate(date: string): Promise<Task[]> {
  const db = await getDb()
  return db.data.tasks.filter((t) => t.date === date)
}

/** 创建任务 */
export async function createTask(task: Task): Promise<Task> {
  const db = await getDb()
  db.data.tasks.push(task)
  await db.write()
  return task
}

/** 更新任务 */
export async function updateTask(id: string, patch: Partial<Task>): Promise<Task | null> {
  const db = await getDb()
  const idx = db.data.tasks.findIndex((t) => t.id === id)
  if (idx === -1) return null
  db.data.tasks[idx] = {
    ...db.data.tasks[idx],
    ...patch,
    updatedAt: Date.now()
  }
  await db.write()
  return db.data.tasks[idx]
}

/** 删除任务 */
export async function deleteTask(id: string): Promise<boolean> {
  const db = await getDb()
  const before = db.data.tasks.length
  db.data.tasks = db.data.tasks.filter((t) => t.id !== id)
  await db.write()
  return db.data.tasks.length < before
}

/** 获取设置 */
export async function getSettings(): Promise<Settings> {
  const db = await getDb()
  return { ...db.data.settings }
}

/** 更新设置 */
export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const db = await getDb()
  db.data.settings = { ...db.data.settings, ...patch }
  await db.write()
  return { ...db.data.settings }
}
export async function getWrongQuestions(): Promise<WrongQuestion[]> {
  const db = await getDb()
  return [...db.data.wrongQuestions]
}

export async function saveWrongQuestion(question: WrongQuestion): Promise<WrongQuestion> {
  const db = await getDb()
  const index = db.data.wrongQuestions.findIndex((item) => item.id === question.id)
  if (index >= 0) db.data.wrongQuestions[index] = question
  else db.data.wrongQuestions.push(question)
  await db.write()
  return question
}

export async function removeWrongQuestion(id: string): Promise<boolean> {
  const db = await getDb()
  const before = db.data.wrongQuestions.length
  db.data.wrongQuestions = db.data.wrongQuestions.filter((item) => item.id !== id)
  await db.write()
  return db.data.wrongQuestions.length !== before
}

/** ====== B站动态跟踪 ====== */

export async function getBiliUps(): Promise<BiliUp[]> {
  const db = await getDb()
  return [...db.data.biliUps]
}

export async function saveBiliUp(up: BiliUp): Promise<BiliUp> {
  const db = await getDb()
  const index = db.data.biliUps.findIndex((item) => item.mid === up.mid)
  if (index >= 0) db.data.biliUps[index] = up
  else db.data.biliUps.push(up)
  await db.write()
  return up
}

export async function removeBiliUp(mid: number): Promise<boolean> {
  const db = await getDb()
  const before = db.data.biliUps.length
  db.data.biliUps = db.data.biliUps.filter((item) => item.mid !== mid)
  db.data.biliDynamics = db.data.biliDynamics.filter((item) => item.mid !== mid)
  await db.write()
  return db.data.biliUps.length !== before
}

export async function getBiliDynamics(): Promise<BiliDynamic[]> {
  const db = await getDb()
  return [...db.data.biliDynamics]
}

export async function saveBiliDynamics(list: BiliDynamic[]): Promise<void> {
  const db = await getDb()
  db.data.biliDynamics = list
  await db.write()
}

/** 合并新动态到存储（按 id 去重、按发布时间倒序、最多保留 200 条） */
export async function mergeBiliDynamics(fresh: BiliDynamic[]): Promise<BiliDynamic[]> {
  const db = await getDb()
  const merged = [...fresh, ...db.data.biliDynamics].filter(
    (item, index, arr) => arr.findIndex((x) => x.id === item.id) === index
  )
  merged.sort((a, b) => b.pubTs - a.pubTs)
  db.data.biliDynamics = merged.slice(0, 200)
  await db.write()
  return [...db.data.biliDynamics]
}
