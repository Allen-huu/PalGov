/** 主进程常量定义 */

/** 应用名称 */
export const APP_NAME = '桌面宠物任务助手'

/** 宠物窗口尺寸 */
export const PET_WINDOW_SIZE = {
  width: 160,
  height: 160
} as const

/** 任务面板窗口尺寸 */
export const TASK_PANEL_SIZE = {
  width: 360,
  height: 480
} as const

/** 设置窗口尺寸 */
export const SETTINGS_WINDOW_SIZE = {
  width: 480,
  height: 600
} as const

/** 提醒检查间隔（毫秒） */
export const NOTIFY_CHECK_INTERVAL = 30_000

/** 数据库文件名 */
export const DB_FILE_NAME = 'tasks.json'

/** IPC 通道名 */
export const IPC_CHANNELS = {
  TASK_LIST: 'task:list',
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  TASK_TOGGLE_DONE: 'task:toggleDone',
  WINDOW_DRAG: 'window:drag',
  WINDOW_HIDE_PANEL: 'window:hidePanel',
  WINDOW_SHOW_PANEL: 'window:showPanel',
  NOTIFY_SHOW: 'notify:show',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  PET_TOGGLE_PANEL: 'pet:togglePanel',
  PET_QUICK_ADD: 'pet:quickAdd'
} as const
