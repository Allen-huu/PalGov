/**
 * 任务数据 Hook：通过 preload API 操作任务
 */
import { useCallback, useEffect, useState } from 'react'
import { Task, TaskInput } from '@shared/types'
import { getTodayDate } from '../utils/date'

export function useTask() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const today = getTodayDate()
    const list = await window.pet.task.list(today)
    setTasks(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const create = useCallback(
    async (input: TaskInput) => {
      const task = await window.pet.task.create(input)
      await refresh()
      return task
    },
    [refresh]
  )

  const toggleDone = useCallback(
    async (id: string) => {
      await window.pet.task.toggleDone(id)
      await refresh()
    },
    [refresh]
  )

  const update = useCallback(
    async (id: string, patch: Partial<Task>) => {
      await window.pet.task.update({ id, patch })
      await refresh()
    },
    [refresh]
  )

  const remove = useCallback(
    async (id: string) => {
      await window.pet.task.delete(id)
      await refresh()
    },
    [refresh]
  )

  return { tasks, loading, refresh, create, toggleDone, update, remove }
}
