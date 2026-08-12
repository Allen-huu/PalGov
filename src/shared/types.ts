/**
 * 主进程与渲染进程共享的类型定义
 */

/** 任务状态 */
export interface Task {
  id: string
  title: string
  note?: string
  /** 到期时间戳（毫秒），可选 */
  dueAt?: number
  done: boolean
  /** 是否已提醒过，避免重复提醒 */
  notified: boolean
  createdAt: number
  updatedAt: number
  /** 归属日期 YYYY-MM-DD，用于按日查询 */
  date: string
}

/** 创建任务入参 */
export interface TaskInput {
  title: string
  note?: string
  dueAt?: number
  date?: string
}

/** 更新任务入参 */
export interface TaskUpdateInput {
  id: string
  patch: Partial<Omit<Task, 'id' | 'createdAt'>>
}

/** 宠物皮肤 */
export type PetSkin = 'cat' | 'dog' | 'robot'

/** 应用设置 */
export interface Settings {
  petSkin: PetSkin
  alwaysOnTop: boolean
  enableNotify: boolean
  notifySound: boolean
  autoStart: boolean
  petPosition?: { x: number; y: number }
  aiApiKey?: string
  aiEnabled: boolean
}

/** AI 聊天请求 */
export interface ChatRequest {
  prompt: string
  context?: string
}

/** AI 聊天响应 */
export interface ChatResponse {
  content: string
  error?: string
}

/** 默认设置 */
export const DEFAULT_SETTINGS: Settings = {
  petSkin: 'cat',
  alwaysOnTop: true,
  enableNotify: true,
  notifySound: true,
  autoStart: false,
  aiApiKey: '',
  aiEnabled: false
}

/** 通知 payload（主进程 → 渲染进程） */
export interface NotifyPayload {
  taskId: string
  title: string
  body: string
  dueAt?: number
}
