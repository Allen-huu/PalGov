/**
 * 提醒服务：每 30 秒检查到期任务并触发通知
 */
import { BrowserWindow, Notification, shell } from 'electron'
import { NOTIFY_CHECK_INTERVAL, IPC_CHANNELS } from '../config/constants'
import { getAllTasks, updateTask, getSettings } from './storeService'
import { NotifyPayload, Task } from '@shared/types'

let timer: NodeJS.Timeout | null = null
let petWindow: BrowserWindow | null = null
let checking = false

export function bindPetWindow(win: BrowserWindow | null): void {
  petWindow = win
}

async function fireNotify(task: Task): Promise<void> {
  const settings = await getSettings()

  if (settings.enableNotify) {
    const notif = new Notification({
      title: '桌面宠物提醒',
      body: task.title,
      silent: !settings.notifySound
    })
    notif.on('click', () => shell.beep())
    notif.show()
  }

  const payload: NotifyPayload = {
    taskId: task.id,
    title: '到点啦！',
    body: task.title,
    dueAt: task.dueAt
  }
  petWindow?.webContents.send(IPC_CHANNELS.NOTIFY_SHOW, payload)

  await updateTask(task.id, { notified: true })
}

export async function checkDueTasks(): Promise<void> {
  if (checking) return
  checking = true
  try {
    const tasks = await getAllTasks()
    const now = Date.now()
    for (const t of tasks) {
      if (t.done || t.notified) continue
      if (typeof t.dueAt === 'number' && t.dueAt <= now) {
        await fireNotify(t)
      }
    }
  } finally {
    checking = false
  }
}

export function startNotifyService(): void {
  if (timer) return
  checkDueTasks().catch((err) => console.error('[notify] check failed:', err))
  timer = setInterval(() => {
    checkDueTasks().catch((err) => console.error('[notify] check failed:', err))
  }, NOTIFY_CHECK_INTERVAL)
}

export function stopNotifyService(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}