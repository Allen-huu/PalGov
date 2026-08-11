/**
 * 任务服务：业务逻辑封装 + ID 生成
 */
import { randomUUID } from 'node:crypto'
import { createTask, deleteTask, getAllTasks, getTasksByDate, updateTask } from './storeService'
import { Task, TaskInput, TaskUpdateInput } from '@shared/types'

/** 获取今日日期 YYYY-MM-DD（本地时区） */
export function getTodayDate(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** 列出任务 */
export async function listTasks(date?: string): Promise<Task[]> {
  if (date) return getTasksByDate(date)
  return getAllTasks()
}

/** 创建任务 */
export async function createTaskService(input: TaskInput): Promise<Task> {
  const now = Date.now()
  const task: Task = {
    id: randomUUID(),
    title: input.title.trim(),
    note: input.note?.trim() || undefined,
    dueAt: input.dueAt,
    done: false,
    notified: false,
    createdAt: now,
    updatedAt: now,
    date: input.date || getTodayDate()
  }
  return createTask(task)
}

/** 更新任务 */
export async function updateTaskService({ id, patch }: TaskUpdateInput): Promise<Task | null> {
  return updateTask(id, patch)
}

/** 切换完成状态 */
export async function toggleTaskDone(id: string): Promise<Task | null> {
  const tasks = await getAllTasks()
  const current = tasks.find((t) => t.id === id)
  if (!current) return null
  return updateTask(id, { done: !current.done })
}

/** 删除任务 */
export async function deleteTaskService(id: string): Promise<boolean> {
  return deleteTask(id)
}
