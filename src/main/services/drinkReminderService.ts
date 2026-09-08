/** 喝水提醒服务：定时触发宠物对话。 */
import { getSettings } from './storeService'
import { sendPetDialogue } from './dialogueService'

let timer: ReturnType<typeof setInterval> | null = null

/** 启动喝水提醒 */
export async function startDrinkReminder(): Promise<void> {
  stopDrinkReminder()
  const settings = await getSettings()
  const minutes = settings.drinkReminderMinutes
  if (minutes <= 0) return

  timer = setInterval(() => {
    void sendPetDialogue('drink')
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
