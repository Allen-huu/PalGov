/** 主进程常量定义 */
import { IPC_CHANNELS } from '@shared/ipcChannels'

export { IPC_CHANNELS }

/** 应用名称 */
export const APP_NAME = '桌面宠物任务助手'

/** 宠物窗口尺寸 */
export const PET_WINDOW_SIZE = {
  width: 110,
  height: 110
} as const

/** 任务面板窗口尺寸 */
export const TASK_PANEL_SIZE = {
  width: 340,
  height: 250
} as const

/** 设置窗口尺寸 */
export const SETTINGS_WINDOW_SIZE = {
  width: 560,
  height: 760
} as const

/** 提醒检查间隔（毫秒） */
export const NOTIFY_CHECK_INTERVAL = 30_000

/** 数据库文件名 */
export const DB_FILE_NAME = 'tasks.json'
