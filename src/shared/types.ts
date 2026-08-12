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

/** 宠物皮肤（唯一角色：水豚噜噜） */
export type PetSkin = 'capybara'

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
  aiProvider: 'deepseek' | 'openai-compatible'
  aiBaseUrl: string
  aiModel: string
  aiTemperature: number
  aiSendTaskContext: boolean
  petVisible: boolean
  /** 全局快捷键 */
  shortcuts: ShortcutConfig
}

/** 快捷键配置 */
export interface ShortcutConfig {
  /** 显示/隐藏面板 */
  togglePanel: string
  /** 显示/隐藏宠物 */
  togglePet: string
  /** 打开设置 */
  showSettings: string
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
  petSkin: 'capybara',
  alwaysOnTop: true,
  enableNotify: true,
  notifySound: true,
  autoStart: false,
  aiApiKey: '',
  aiEnabled: false,
  aiProvider: 'deepseek',
  aiBaseUrl: 'https://api.deepseek.com/v1',
  aiModel: 'deepseek-chat',
  aiTemperature: 0.7,
  aiSendTaskContext: true,
  petVisible: true,
  shortcuts: {
    togglePanel: 'CommandOrControl+Shift+P',
    togglePet: 'CommandOrControl+Shift+H',
    showSettings: 'CommandOrControl+Shift+S'
  }
}

/** 通知 payload（主进程 → 渲染进程） */
export interface NotifyPayload {
  taskId: string
  title: string
  body: string
  dueAt?: number
}
