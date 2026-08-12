/**
 * lowdb 封装：负责本地 JSON 数据持久化
 */
import { app } from 'electron'
import { join } from 'node:path'
import { JSONFilePreset } from 'lowdb/node'
import { DB_FILE_NAME } from '../config/constants'
import { DEFAULT_SETTINGS, Settings, Task } from '@shared/types'

/** 数据库结构 */
export interface DbSchema {
  tasks: Task[]
  settings: Settings
}

/** 默认数据 */
const defaultData: DbSchema = {
  tasks: [],
  settings: { ...DEFAULT_SETTINGS }
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
    if (!instance.data.settings) {
      instance.data.settings = { ...DEFAULT_SETTINGS }
    }
    if (!Array.isArray(instance.data.tasks)) {
      instance.data.tasks = []
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
