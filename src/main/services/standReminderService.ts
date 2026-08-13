/**
 * 站立提醒服务：定时向宠物窗口发送气泡对话
 */
import { getSettings } from './storeService'
import { getPetWindow } from '../windows/petWindow'
import { IPC_CHANNELS } from '../config/constants'

const MESSAGES = [
  '🧍 坐太久啦，站起来活动一下吧！',
  '🦵 噜噜提醒你：该站一站了~',
  '🚶 久坐伤身，快起来走走',
  '🙆 伸个懒腰，放松一下肩膀',
  '🏃 站起来活动5分钟，精力更充沛！',
]

let timer: ReturnType<typeof setInterval> | null = null

/** 启动站立提醒 */
export async function startStandReminder(): Promise<void> {
  stopStandReminder()
  const settings = await getSettings()
  const minutes = settings.standReminderMinutes
  if (minutes <= 0) return

  timer = setInterval(() => {
    const pet = getPetWindow()
    if (pet && !pet.isDestroyed()) {
      const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
      pet.webContents.send(IPC_CHANNELS.PET_SPEECH, msg)
    }
  }, minutes * 60_000)
}

/** 停止站立提醒 */
export function stopStandReminder(): void {
  if (timer) { clearInterval(timer); timer = null }
}

/** 重启站立提醒（设置变更后调用） */
export async function restartStandReminder(): Promise<void> {
  await startStandReminder()
}