/**
 * 任务相关 IPC handler 注册
 */
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../config/constants'
import {
  createTaskService,
  deleteTaskService,
  listTasks,
  toggleTaskDone,
  updateTaskService
} from '../services/taskService'
import { getTodayDate } from '../services/taskService'
import { TaskInput, TaskUpdateInput } from '@shared/types'

export function registerTaskIpc(): void {
  ipcMain.handle(IPC_CHANNELS.TASK_LIST, async (_evt, args?: { date?: string }) => {
    const date = args?.date || getTodayDate()
    return listTasks(date)
  })

  ipcMain.handle(IPC_CHANNELS.TASK_CREATE, async (_evt, input: TaskInput) => {
    return createTaskService(input)
  })

  ipcMain.handle(IPC_CHANNELS.TASK_UPDATE, async (_evt, payload: TaskUpdateInput) => {
    return updateTaskService(payload)
  })

  ipcMain.handle(IPC_CHANNELS.TASK_DELETE, async (_evt, args: { id: string }) => {
    return deleteTaskService(args.id)
  })

  ipcMain.handle(IPC_CHANNELS.TASK_TOGGLE_DONE, async (_evt, args: { id: string }) => {
    return toggleTaskDone(args.id)
  })
}
