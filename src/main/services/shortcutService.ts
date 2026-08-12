/**
 * 全局快捷键服务：根据设置动态注册/注销快捷键
 */
import { globalShortcut } from 'electron'
import { ShortcutConfig } from '@shared/types'
import { getSettings } from './storeService'
import { toggleTaskWindow } from '../windows/taskWindow'
import { hidePetWindow, showPetWindow, getPetWindow } from '../windows/petWindow'
import { showSettingsWindow } from '../windows/settingsWindow'

/** 已注册的快捷键 accelerator 集合 */
let registered: string[] = []

/** 根据设置注册所有全局快捷键 */
export async function registerShortcuts(): Promise<void> {
  const { shortcuts } = await getSettings()
  applyShortcuts(shortcuts)
}

/** 注销所有已注册快捷键 */
export function unregisterAllShortcuts(): void {
  for (const acc of registered) {
    globalShortcut.unregister(acc)
  }
  registered = []
}

/** 应用新的快捷键配置 */
export function applyShortcuts(config: ShortcutConfig): void {
  unregisterAllShortcuts()

  const actions: Array<{ accelerator: string; action: () => void }> = [
    {
      accelerator: config.togglePanel,
      action: () => toggleTaskWindow()
    },
    {
      accelerator: config.togglePet,
      action: () => {
        const pet = getPetWindow()
        if (pet && pet.isVisible()) {
          hidePetWindow()
        } else {
          showPetWindow()
        }
      }
    },
    {
      accelerator: config.showSettings,
      action: () => showSettingsWindow()
    }
  ]

  for (const { accelerator, action } of actions) {
    if (!accelerator) continue
    // 跳过空字符串和重复快捷键
    if (registered.includes(accelerator)) continue
    try {
      const ok = globalShortcut.register(accelerator, action)
      if (ok) {
        registered.push(accelerator)
      } else {
        console.warn(`[shortcut] 注册失败: ${accelerator}`)
      }
    } catch (err) {
      console.warn(`[shortcut] 注册异常: ${accelerator}`, err)
    }
  }
}