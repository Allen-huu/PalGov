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
  /** 答题快捷键 */
  quizShortcuts: QuizShortcutConfig
  /** 喝水提醒间隔（分钟），0 表示关闭 */
  drinkReminderMinutes: number
  /** 站立提醒间隔（分钟），0 表示关闭 */
  standReminderMinutes: number
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

/** 答题快捷键配置 */
export interface QuizShortcutConfig {
  /** 选择选项 A */
  selectA: string
  /** 选择选项 B */
  selectB: string
  /** 选择选项 C */
  selectC: string
  /** 选择选项 D */
  selectD: string
  /** 下一题 */
  nextQuestion: string
  /** 上一题 */
  prevQuestion: string
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
  },
  quizShortcuts: {
    selectA: 'A',
    selectB: 'B',
    selectC: 'C',
    selectD: 'D',
    nextQuestion: 'Enter',
    prevQuestion: 'ArrowLeft'
  },
  drinkReminderMinutes: 30,
  standReminderMinutes: 60
}

/** 通知 payload（主进程 → 渲染进程） */
export interface NotifyPayload {
  taskId: string
  title: string
  body: string
  dueAt?: number
}

/** ====== 题库与答题 ====== */

/** 题目类型 */
export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer'

/** 难度 */
export type Difficulty = 'easy' | 'medium' | 'hard'

/** 单道题目 */
export interface Question {
  /** 唯一标识 */
  id: string
  /** 题目类型 */
  type: QuestionType
  /** 题目文本 */
  question: string
  /** 选项列表（选择题必填） */
  options: string[]
  /** 正确答案（选择题为选项索引，简答题为参考答案文本） */
  answer: number | string
  /** 题目解析 */
  explanation: string
  /** 难度 */
  difficulty: Difficulty
  /** 标签 */
  tags: string[]
}

/** 题库 */
export interface QuestionBank {
  /** 题库名称 */
  name: string
  /** 题库描述 */
  description: string
  /** 题目列表 */
  questions: Question[]
}

/** 题库索引（列表预览用） */
export interface QuestionBankInfo {
  /** 文件名（不含扩展名） */
  fileName: string
  /** 题库名称 */
  name: string
  /** 描述 */
  description: string
  /** 题目数量 */
  questionCount: number
}

/** 答题记录 */
export interface QuizRecord {
  questionId: string
  userAnswer: number | string
  correct: boolean
  answeredAt: number
  /** AI 详细解析 */
  aiExplanation?: string
}
