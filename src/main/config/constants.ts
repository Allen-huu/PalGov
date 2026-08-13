/** 主进程常量定义 */

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
  PET_QUICK_ADD: 'pet:quickAdd',
  SETTINGS_SHOW: 'settings:show',
  PET_HIDE: 'pet:hide',
  PET_SHOW: 'pet:show',
  AI_CHAT: 'ai:chat',
  AI_SET_KEY: 'ai:setKey',
  AI_GET_STATUS: 'ai:getStatus',
  /** 宠物动画事件（答题反馈等） */
  PET_ANIM_EVENT: 'pet:animEvent',
  /** 宠物对话气泡 */
  PET_SPEECH: 'pet:speech'
} as const
