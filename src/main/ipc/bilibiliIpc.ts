/**
 * B站动态跟踪 IPC 处理器
 */
import { ipcMain } from 'electron'
import { getBiliUps, getBiliDynamics } from '../services/storeService'
import { addBiliUp, removeBiliUpByMid, refreshBiliNow, getBiliStatus } from '../services/bilibiliService'
import { BiliUp, BiliDynamic, BiliAddResult } from '@shared/types'

export function registerBilibiliIpc(): void {
  ipcMain.handle('bili:addUp', async (_evt, input: string): Promise<BiliAddResult> => {
    return addBiliUp(input)
  })

  ipcMain.handle('bili:removeUp', async (_evt, payload: { mid: number }): Promise<boolean> => {
    return removeBiliUpByMid(payload.mid)
  })

  ipcMain.handle('bili:listUps', async (): Promise<BiliUp[]> => {
    return getBiliUps()
  })

  ipcMain.handle('bili:listDynamics', async (): Promise<BiliDynamic[]> => {
    return (await getBiliDynamics()).sort((a, b) => b.pubTs - a.pubTs)
  })

  ipcMain.handle('bili:refreshNow', async (): Promise<void> => {
    await refreshBiliNow()
  })

  ipcMain.handle(
    'bili:getStatus',
    async (): Promise<{ lastError: string | null; lastPollAt: number | null; nextPollAt: number | null }> => {
      return getBiliStatus()
    }
  )
}
