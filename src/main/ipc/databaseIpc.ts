import { ipcMain } from 'electron'
import { getMySqlConfig, getMySqlStatus, testAndBindMySql, unbindMySql } from '../services/mysqlService'
import { MySqlConfig } from '@shared/types'
import { migrateLocalDataToMySql, removeLocalDataStore } from '../services/storeService'
import { getBanksDir, importQuestionBank } from '../services/quizService'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

export function registerDatabaseIpc(): void {
  ipcMain.handle('database:status', () => getMySqlStatus())
  ipcMain.handle('database:config', async () => {
    const config = await getMySqlConfig()
    return config ? { ...config, password: '' } : null
  })
  ipcMain.handle('database:bind', async (_event, config: MySqlConfig) => {
    const wasBound = (await getMySqlStatus()).bound
    const result = await testAndBindMySql(config)
    if (result.ok && !wasBound) {
      await migrateLocalDataToMySql()
      const dir = getBanksDir()
      try {
        for (const file of await readdir(dir)) {
          if (!file.endsWith('.json')) continue
          const bank = JSON.parse(await readFile(join(dir, file), 'utf8'))
          await importQuestionBank(file.slice(0, -5), bank)
        }
      } catch { /* packaged or empty question-bank directory */ }
    }
    if (result.ok) await removeLocalDataStore()
    return result
  })
  ipcMain.handle('database:unbind', () => unbindMySql())
}
