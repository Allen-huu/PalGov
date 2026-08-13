/**
 * 拖拽 Hook：监听 mousedown/mousemove/mouseup，向主进程发送偏移量
 * 修复：增加移动阈值，避免单击时产生微小位移导致窗口漂移
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const DRAG_THRESHOLD = 3 // 至少移动 3px 才算拖拽

export function useDrag() {
  const draggingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const movedRef = useRef(false)
  const accRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    draggingRef.current = true
    movedRef.current = false
    accRef.current = { x: 0, y: 0 }
    lastPosRef.current = { x: e.screenX, y: e.screenY }
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      // 鼠标在窗口外松开时 mouseup 无法被捕获，通过 buttons 检测修复
      if ((e.buttons & 1) === 0) {
        draggingRef.current = false
        setIsDragging(false)
        return
      }
      const dx = e.screenX - lastPosRef.current.x
      const dy = e.screenY - lastPosRef.current.y
      lastPosRef.current = { x: e.screenX, y: e.screenY }

      accRef.current.x += dx
      accRef.current.y += dy

      if (Math.abs(accRef.current.x) > DRAG_THRESHOLD || Math.abs(accRef.current.y) > DRAG_THRESHOLD) {
        if (!movedRef.current) setIsDragging(true)
        movedRef.current = true
        window.pet.window.drag(accRef.current.x, accRef.current.y)
        accRef.current = { x: 0, y: 0 }
      }
    }

    const onMouseUp = () => {
      draggingRef.current = false
      setIsDragging(false)
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

  return { onMouseDown, hasDragged, isDragging }
}
