/**
 * 提醒服务：每 30 秒检查到期任务并触发通知
 */
import { BrowserWindow, Notification, shell } from 'electron'
import { NOTIFY_CHECK_INTERVAL, IPC_CHANNELS } from '../config/constants'
import { getAllTasks, updateTask } from './storeService'
import { getSettings } from './storeService'
import { NotifyPayload, Task } from '@shared/types'

let timer: NodeJS.Timeout | null = null
let petWindow: BrowserWindow | null = null

/** 绑定宠物窗口引用（主进程入口调用） */
export function bindPetWindow(win: BrowserWindow | null): void {
  petWindow = win
}

/** 触发提醒（发送系统通知 + 通知渲染进程显示气泡） */
async function fireNotify(task: Task): Promise<void> {
  const settings = await getSettings()

  // 1. 系统通知
  if (settings.enableNotify) {
    const notif = new Notification({
      title: '桌面宠物提醒',
      body: task.title,
      silent: !settings.notifySound
    })
    notif.on('click', () => {
      shell.beep()
    })
    notif.show()
  }

  // 2. 通知渲染进程显示气泡 + 跳跃动画
  const payload: NotifyPayload = {
    taskId: task.id,
    title: '到点啦！',
    body: task.title,
    dueAt: task.dueAt
  }
  petWindow?.webContents.send(IPC_CHANNELS.NOTIFY_SHOW, payload)

  // 3. 标记为已提醒，避免重复触发
  await updateTask(task.id, { notified: true })
}

/** 检查一次到期任务 */
export async function checkDueTasks(): Promise<void> {
  const tasks = await getAllTasks()
  const now = Date.now()
  for (const t of tasks) {
    if (t.done || t.notified) continue
    if (typeof t.dueAt === 'number' && t.dueAt <= now) {
      await fireNotify(t)
    }
  }
}

/** 启动提醒检查循环 */
export function startNotifyService(): void {
  if (timer) return
  // 立即检查一次
  checkDueTasks().catch((err) => console.error('[notify] check failed:', err))
  timer = setInterval(() => {
    checkDueTasks().catch((err) => console.error('[notify] check failed:', err))
  }, NOTIFY_CHECK_INTERVAL)
}

/** 停止提醒检查 */
export function stopNotifyService(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
