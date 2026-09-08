/**
 * lowdb 封装：负责本地 JSON 数据持久化
 */
import { app } from 'electron'
import { join } from 'node:path'
import { JSONFilePreset } from 'lowdb/node'
import { unlink } from 'node:fs/promises'
import { DB_FILE_NAME } from '../config/constants'
import { DEFAULT_SETTINGS, normalizeShortcutConfig, Settings, Task, WrongQuestion, BiliUp, BiliDynamic, Thought, ThoughtRelation, QuizProgress } from '@shared/types'
import { getMySqlPool, queryOne, queryRows, execute } from './mysqlService'

/** 数据库结构 */
export interface DbSchema {
  tasks: Task[]
  settings: Settings
  wrongQuestions: WrongQuestion[]
  biliUps: BiliUp[]
  biliDynamics: BiliDynamic[]
  thoughts: Thought[]
  quizProgress: Record<string, QuizProgress>
}

/** 默认数据 */
const defaultData: DbSchema = {
  tasks: [],
  settings: { ...DEFAULT_SETTINGS },
  wrongQuestions: [],
  biliUps: [],
  biliDynamics: []
  ,thoughts: []
  ,quizProgress: {}
}

let dbPromise: ReturnType<typeof JSONFilePreset<DbSchema>> | null = null

/** 获取 db 文件路径 */
export function getDbPath(): string {
  return join(app.getPath('userData'), DB_FILE_NAME)
}

/** MySQL 绑定完成后移除旧的本地业务库，避免双写和数据来源不一致。 */
export async function removeLocalDataStore(): Promise<void> {
  try { await unlink(getDbPath()) } catch { /* 文件不存在时无需处理 */ }
  dbPromise = null
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
    if (!Array.isArray(instance.data.thoughts)) {
      instance.data.thoughts = []
    }
    if (!instance.data.quizProgress || typeof instance.data.quizProgress !== 'object') {
      instance.data.quizProgress = {}
    }
    await instance.write()
    dbPromise = Promise.resolve(instance)
  }
  return dbPromise
}

/** 获取所有任务 */
export async function getAllTasks(): Promise<Task[]> {
  if (await getMySqlPool()) {
    const rows = await queryRows<any[]>('SELECT id,title,note,due_at AS dueAt,done,notified,created_at AS createdAt,updated_at AS updatedAt,DATE_FORMAT(task_date, \'%Y-%m-%d\') AS date FROM tasks ORDER BY task_date, created_at')
    return rows.map((row) => ({ ...row, done: !!row.done, notified: !!row.notified, dueAt: row.dueAt == null ? undefined : Number(row.dueAt) })) as Task[]
  }
  const db = await getDb()
  return [...db.data.tasks]
}

/** 获取指定日期任务 */
export async function getTasksByDate(date: string): Promise<Task[]> {
  if (await getMySqlPool()) {
    const rows = await queryRows<any[]>('SELECT id,title,note,due_at AS dueAt,done,notified,created_at AS createdAt,updated_at AS updatedAt,DATE_FORMAT(task_date, \'%Y-%m-%d\') AS date FROM tasks WHERE task_date = ? ORDER BY created_at', [date])
    return rows.map((row) => ({ ...row, done: !!row.done, notified: !!row.notified, dueAt: row.dueAt == null ? undefined : Number(row.dueAt) })) as Task[]
  }
  const db = await getDb()
  return db.data.tasks.filter((t) => t.date === date)
}

/** 创建任务 */
export async function createTask(task: Task): Promise<Task> {
  if (await getMySqlPool()) {
    await execute('INSERT INTO tasks (id,title,note,due_at,done,notified,created_at,updated_at,task_date) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title),note=VALUES(note),due_at=VALUES(due_at),done=VALUES(done),notified=VALUES(notified),updated_at=VALUES(updated_at),task_date=VALUES(task_date)', [task.id, task.title, task.note ?? null, task.dueAt ?? null, task.done, task.notified, task.createdAt, task.updatedAt, task.date])
    return task
  }
  const db = await getDb()
  db.data.tasks.push(task)
  await db.write()
  return task
}

/** 更新任务 */
export async function updateTask(id: string, patch: Partial<Task>): Promise<Task | null> {
  if (await getMySqlPool()) {
    const current = (await getTasksById(id))
    if (!current) return null
    const next = { ...current, ...patch, updatedAt: Date.now() }
    await execute('UPDATE tasks SET title=?,note=?,due_at=?,done=?,notified=?,updated_at=?,task_date=? WHERE id=?', [next.title, next.note ?? null, next.dueAt ?? null, next.done, next.notified, next.updatedAt, next.date, id])
    return next
  }
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
  if (await getMySqlPool()) {
    const before = await getTasksById(id)
    await execute('DELETE FROM tasks WHERE id=?', [id])
    return !!before
  }
  const db = await getDb()
  const before = db.data.tasks.length
  db.data.tasks = db.data.tasks.filter((t) => t.id !== id)
  await db.write()
  return db.data.tasks.length < before
}

/** 获取设置 */
export async function getSettings(): Promise<Settings> {
  if (await getMySqlPool()) {
    const row = await queryOne<any[]>('SELECT payload FROM app_settings WHERE id=1')
    const settings = { ...DEFAULT_SETTINGS, ...(row?.payload ?? {}) }
    return { ...settings, shortcuts: normalizeShortcutConfig(settings.shortcuts) }
  }
  const db = await getDb()
  return { ...db.data.settings, shortcuts: normalizeShortcutConfig(db.data.settings.shortcuts) }
}

/** 更新设置 */
export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const normalizedPatch: Partial<Settings> = patch.shortcuts
    ? { ...patch, shortcuts: normalizeShortcutConfig(patch.shortcuts) }
    : patch
  if (await getMySqlPool()) {
    const next = { ...(await getSettings()), ...normalizedPatch }
    await execute('INSERT INTO app_settings (id,payload,updated_at) VALUES (1,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),updated_at=VALUES(updated_at)', [JSON.stringify(next), Date.now()])
    return next
  }
  const db = await getDb()
  db.data.settings = { ...db.data.settings, ...normalizedPatch }
  await db.write()
  return { ...db.data.settings }
}
export async function getWrongQuestions(): Promise<WrongQuestion[]> {
  if (await getMySqlPool()) {
    const rows = await queryRows<any[]>('SELECT payload FROM wrong_questions ORDER BY next_review_at')
    return rows.map((row) => typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload) as WrongQuestion[]
  }
  const db = await getDb()
  return [...db.data.wrongQuestions]
}

export async function saveWrongQuestion(question: WrongQuestion): Promise<WrongQuestion> {
  if (await getMySqlPool()) {
    await execute('INSERT INTO wrong_questions (id,bank_file_name,payload,next_review_at,updated_at) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),next_review_at=VALUES(next_review_at),updated_at=VALUES(updated_at)', [question.id, question.bankFileName, JSON.stringify(question), question.nextReviewAt, question.updatedAt])
    return question
  }
  const db = await getDb()
  const index = db.data.wrongQuestions.findIndex((item) => item.id === question.id)
  if (index >= 0) db.data.wrongQuestions[index] = question
  else db.data.wrongQuestions.push(question)
  await db.write()
  return question
}

export async function removeWrongQuestion(id: string): Promise<boolean> {
  if (await getMySqlPool()) {
    const existing = (await queryOne<any[]>('SELECT id FROM wrong_questions WHERE id=?', [id]))
    await execute('DELETE FROM wrong_questions WHERE id=?', [id])
    return !!existing
  }
  const db = await getDb()
  const before = db.data.wrongQuestions.length
  db.data.wrongQuestions = db.data.wrongQuestions.filter((item) => item.id !== id)
  await db.write()
  return db.data.wrongQuestions.length !== before
}

/** ====== B站动态跟踪 ====== */

export async function getBiliUps(): Promise<BiliUp[]> {
  if (await getMySqlPool()) {
    const rows = await queryRows<any[]>('SELECT mid,name,avatar,last_dynamic_id AS lastDynamicId,added_at AS addedAt FROM bili_ups ORDER BY added_at')
    return rows.map((row) => ({ ...row, mid: Number(row.mid), addedAt: Number(row.addedAt) })) as BiliUp[]
  }
  const db = await getDb()
  return [...db.data.biliUps]
}

export async function saveBiliUp(up: BiliUp): Promise<BiliUp> {
  if (await getMySqlPool()) {
    await execute('INSERT INTO bili_ups (mid,name,avatar,last_dynamic_id,added_at) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),avatar=VALUES(avatar),last_dynamic_id=VALUES(last_dynamic_id),added_at=VALUES(added_at)', [up.mid, up.name, up.avatar ?? null, up.lastDynamicId ?? null, up.addedAt])
    return up
  }
  const db = await getDb()
  const index = db.data.biliUps.findIndex((item) => item.mid === up.mid)
  if (index >= 0) db.data.biliUps[index] = up
  else db.data.biliUps.push(up)
  await db.write()
  return up
}

export async function removeBiliUp(mid: number): Promise<boolean> {
  if (await getMySqlPool()) {
    const existing = await queryOne<any[]>('SELECT mid FROM bili_ups WHERE mid=?', [mid])
    await execute('DELETE FROM bili_ups WHERE mid=?', [mid])
    await execute('DELETE FROM bili_dynamics WHERE mid=?', [mid])
    return !!existing
  }
  const db = await getDb()
  const before = db.data.biliUps.length
  db.data.biliUps = db.data.biliUps.filter((item) => item.mid !== mid)
  db.data.biliDynamics = db.data.biliDynamics.filter((item) => item.mid !== mid)
  await db.write()
  return db.data.biliUps.length !== before
}

export async function getBiliDynamics(): Promise<BiliDynamic[]> {
  if (await getMySqlPool()) {
    const rows = await queryRows<any[]>('SELECT id,mid,up_name AS upName,up_avatar AS upAvatar,type,text,url,pub_ts AS pubTs,fetched_at AS fetchedAt FROM bili_dynamics ORDER BY pub_ts DESC')
    return rows.map((row) => ({ ...row, mid: Number(row.mid), pubTs: Number(row.pubTs), fetchedAt: Number(row.fetchedAt) })) as BiliDynamic[]
  }
  const db = await getDb()
  return [...db.data.biliDynamics]
}

export async function saveBiliDynamics(list: BiliDynamic[]): Promise<void> {
  if (await getMySqlPool()) {
    for (const item of list) await execute('INSERT INTO bili_dynamics (id,mid,up_name,up_avatar,type,text,url,pub_ts,fetched_at) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE up_name=VALUES(up_name),up_avatar=VALUES(up_avatar),text=VALUES(text),pub_ts=VALUES(pub_ts),fetched_at=VALUES(fetched_at)', [item.id, item.mid, item.upName, item.upAvatar ?? null, item.type, item.text, item.url, item.pubTs, item.fetchedAt])
    return
  }
  const db = await getDb()
  db.data.biliDynamics = list
  await db.write()
}

/** 合并新动态到存储（按 id 去重、按发布时间倒序、最多保留 200 条） */
export async function mergeBiliDynamics(fresh: BiliDynamic[]): Promise<BiliDynamic[]> {
  if (await getMySqlPool()) {
    await saveBiliDynamics(fresh)
    const list = await getBiliDynamics()
    for (const extra of list.slice(200)) await execute('DELETE FROM bili_dynamics WHERE id=?', [extra.id])
    return list.slice(0, 200)
  }
  const db = await getDb()
  const merged = [...fresh, ...db.data.biliDynamics].filter(
    (item, index, arr) => arr.findIndex((x) => x.id === item.id) === index
  )
  merged.sort((a, b) => b.pubTs - a.pubTs)
  db.data.biliDynamics = merged.slice(0, 200)
  await db.write()
  return [...db.data.biliDynamics]
}

async function getTasksById(id: string): Promise<Task | null> {
  const rows = await getAllTasks()
  return rows.find((task) => task.id === id) ?? null
}

export async function getThoughts(includeArchived = false): Promise<Thought[]> {
  if (await getMySqlPool()) {
    const rows = await queryRows<any[]>(`SELECT id,raw_text AS rawText,summary,topics,related_ids AS relatedIds,relations,source_name AS sourceName,ai_status AS aiStatus,created_at AS createdAt,updated_at AS updatedAt,archived FROM thoughts ${includeArchived ? '' : 'WHERE archived=FALSE'} ORDER BY updated_at DESC`)
    return rows.map((row) => ({ ...row, topics: parseJsonArray(row.topics), relatedIds: parseJsonArray(row.relatedIds), relations: parseRelations(row.relations), archived: !!row.archived, createdAt: Number(row.createdAt), updatedAt: Number(row.updatedAt) })) as Thought[]
  }
  const db = await getDb()
  return [...(db.data.thoughts ?? [])].filter((item) => includeArchived || !item.archived).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function saveThought(thought: Thought): Promise<Thought> {
  if (await getMySqlPool()) {
    await execute('INSERT INTO thoughts (id,raw_text,summary,topics,related_ids,relations,source_name,ai_status,created_at,updated_at,archived) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE raw_text=VALUES(raw_text),summary=VALUES(summary),topics=VALUES(topics),related_ids=VALUES(related_ids),relations=VALUES(relations),source_name=VALUES(source_name),ai_status=VALUES(ai_status),updated_at=VALUES(updated_at),archived=VALUES(archived)', [thought.id, thought.rawText, thought.summary ?? null, JSON.stringify(thought.topics ?? []), JSON.stringify(thought.relatedIds ?? []), JSON.stringify(thought.relations ?? []), thought.sourceName ?? null, thought.aiStatus, thought.createdAt, thought.updatedAt, thought.archived])
    return thought
  }
  const db = await getDb()
  const index = (db.data.thoughts ?? []).findIndex((item) => item.id === thought.id)
  if (index >= 0) db.data.thoughts[index] = thought
  else db.data.thoughts.push(thought)
  await db.write()
  return thought
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value !== 'string') return []
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : [] } catch { return [] }
}

function parseRelations(value: unknown): ThoughtRelation[] {
  if (Array.isArray(value)) return value.filter((item): item is ThoughtRelation => !!item && typeof item === 'object' && typeof item.thoughtId === 'string').map((item) => ({ thoughtId: item.thoughtId, summary: String(item.summary ?? ''), reason: String(item.reason ?? ''), confidence: Number(item.confidence) || 0 }))
  if (typeof value !== 'string') return []
  try { return parseRelations(JSON.parse(value)) } catch { return [] }
}

/** 首次绑定 MySQL 时把已有本地数据复制到规范化表中。复制完成后后续读写走 MySQL。 */
export async function migrateLocalDataToMySql(): Promise<void> {
  const local = await JSONFilePreset<DbSchema>(getDbPath(), defaultData)
  for (const task of local.data.tasks ?? []) await createTask(task)
  if (local.data.settings) await setSettings(local.data.settings)
  for (const item of local.data.wrongQuestions ?? []) await saveWrongQuestion(item)
  for (const up of local.data.biliUps ?? []) await saveBiliUp(up)
  await saveBiliDynamics(local.data.biliDynamics ?? [])
  for (const thought of local.data.thoughts ?? []) await saveThought(thought)
  for (const progress of Object.values(local.data.quizProgress ?? {})) await saveQuizProgress(progress)
}

export async function listQuizProgress(): Promise<Record<string, QuizProgress>> {
  if (await getMySqlPool()) {
    const rows = await queryRows<any[]>('SELECT bank_file_name AS bankFileName,payload FROM quiz_progress')
    return Object.fromEntries(rows.map((row) => {
      const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
      return [row.bankFileName, payload as QuizProgress]
    }))
  }
  const db = await getDb()
  return { ...(db.data.quizProgress ?? {}) }
}

export async function saveQuizProgress(progress: QuizProgress): Promise<void> {
  if (!progress || typeof progress.bankFileName !== 'string' || !progress.bankFileName.trim()) return
  const normalized: QuizProgress = {
    bankFileName: progress.bankFileName.trim(),
    qIndex: Number.isFinite(progress.qIndex) ? Math.max(0, Math.floor(progress.qIndex)) : 0,
    records: Array.isArray(progress.records) ? progress.records : []
  }
  if (await getMySqlPool()) {
    await execute('INSERT INTO quiz_progress (bank_file_name,payload,updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),updated_at=VALUES(updated_at)', [normalized.bankFileName, JSON.stringify(normalized), Date.now()])
    return
  }
  const db = await getDb()
  db.data.quizProgress[normalized.bankFileName] = normalized
  await db.write()
}

export async function deleteQuizProgress(bankFileName: string): Promise<void> {
  if (await getMySqlPool()) {
    await execute('DELETE FROM quiz_progress WHERE bank_file_name=?', [bankFileName])
    return
  }
  const db = await getDb()
  delete db.data.quizProgress[bankFileName]
  await db.write()
}
