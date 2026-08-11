/**
 * 拖拽 Hook：监听 mousedown/mousemove/mouseup，向主进程发送偏移量
 */
import { useCallback, useEffect, useRef } from 'react'

export function useDrag() {
  const draggingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const movedRef = useRef(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // 仅响应左键
    if (e.button !== 0) return
    draggingRef.current = true
    movedRef.current = false
    lastPosRef.current = { x: e.screenX, y: e.screenY }
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const dx = e.screenX - lastPosRef.current.x
      const dy = e.screenY - lastPosRef.current.y
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        movedRef.current = true
      }
      lastPosRef.current = { x: e.screenX, y: e.screenY }
      window.pet.window.drag(dx, dy)
    }

    const onMouseUp = () => {
      draggingRef.current = false
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  /** 是否发生过拖拽（用于区分 click 和 drag） */
  const hasDragged = useCallback(() => movedRef.current, [])

  return { onMouseDown, hasDragged }
}
