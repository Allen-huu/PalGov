/** IPC 通道名（主进程 / preload / 渲染进程共用） */
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
  PET_SPEECH: 'pet:speech',
  /** B站动态更新（主进程 → 渲染进程） */
  BILI_UPDATE: 'bili:update'
} as const
