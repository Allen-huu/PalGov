/** 站立提醒服务：定时触发宠物对话。 */
import { getSettings } from './storeService'
import { sendPetDialogue } from './dialogueService'

let timer: ReturnType<typeof setInterval> | null = null

/** 启动站立提醒 */
export async function startStandReminder(): Promise<void> {
  stopStandReminder()
  const settings = await getSettings()
  const minutes = settings.standReminderMinutes
  if (minutes <= 0) return

  timer = setInterval(() => {
    void sendPetDialogue('stand')
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
