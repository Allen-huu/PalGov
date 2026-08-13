/**
 * 喝水提醒服务：定时向宠物窗口发送气泡对话
 */
import { getSettings } from './storeService'
import { getPetWindow } from '../windows/petWindow'
import { IPC_CHANNELS } from '../config/constants'

const MESSAGES = [
  '💧 该喝水啦！起来活动一下',
  '🥤 噜噜提醒你：记得喝水！',
  '☕ 坐了这么久，喝口水吧',
  '🧊 补充水分，保持清醒~',
  '💦 水是生命之源，来一口！',
]

let timer: ReturnType<typeof setInterval> | null = null

/** 启动喝水提醒 */
export async function startDrinkReminder(): Promise<void> {
  stopDrinkReminder()
  const settings = await getSettings()
  const minutes = settings.drinkReminderMinutes
  if (minutes <= 0) return

  timer = setInterval(() => {
    const pet = getPetWindow()
    if (pet && !pet.isDestroyed()) {
      const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
      pet.webContents.send(IPC_CHANNELS.PET_SPEECH, msg)
    }
  }, minutes * 60_000)
}

/** 停止喝水提醒 */
export function stopDrinkReminder(): void {
  if (timer) { clearInterval(timer); timer = null }
}

/** 重启喝水提醒（设置变更后调用） */
export async function restartDrinkReminder(): Promise<void> {
  await startDrinkReminder()
}