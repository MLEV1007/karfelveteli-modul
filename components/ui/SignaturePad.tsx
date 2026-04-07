"use client"

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react"

export interface SignaturePadHandle {
  isEmpty: () => boolean
  clear: () => void
  toDataURL: (type?: string) => string
}

interface SignaturePadProps {
  onEnd?: () => void
  penColor?: string
  backgroundColor?: string
  height?: number
}

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  ({ onEnd, penColor = "#1e293b", backgroundColor = "white", height = 180 }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDrawing = useRef(false)
    const isEmpty = useRef(true)

    const getCtx = () => {
      const canvas = canvasRef.current
      if (!canvas) return null
      return canvas.getContext("2d")
    }

    const resizeCanvas = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, rect.width, rect.height)
      ctx.strokeStyle = penColor
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      isEmpty.current = true
    }, [backgroundColor, penColor])

    useEffect(() => {
      resizeCanvas()
      const observer = new ResizeObserver(resizeCanvas)
      if (canvasRef.current) observer.observe(canvasRef.current)
      return () => observer.disconnect()
    }, [resizeCanvas])

    useEffect(() => {
      const ctx = getCtx()
      if (ctx) {
        ctx.strokeStyle = penColor
      }
    }, [penColor])

    const getPos = (e: PointerEvent): { x: number; y: number } => {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.setPointerCapture(e.pointerId)
      isDrawing.current = true
      const ctx = getCtx()
      if (!ctx) return
      const { x, y } = getPos(e.nativeEvent)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }, [])

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      if (!isDrawing.current) return
      const ctx = getCtx()
      if (!ctx) return
      const { x, y } = getPos(e.nativeEvent)
      ctx.lineTo(x, y)
      ctx.stroke()
      isEmpty.current = false
    }, [])

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      if (!isDrawing.current) return
      isDrawing.current = false
      const ctx = getCtx()
      if (ctx) ctx.closePath()
      onEnd?.()
    }, [onEnd])

    useImperativeHandle(ref, () => ({
      isEmpty: () => isEmpty.current,
      clear: () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const rect = canvas.getBoundingClientRect()
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, rect.width, rect.height)
        isEmpty.current = true
      },
      toDataURL: (type = "image/png") => {
        return canvasRef.current?.toDataURL(type) ?? ""
      },
    }))

    return (
      <canvas
        ref={canvasRef}
        style={{ height, width: "100%", display: "block", touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    )
  }
)

SignaturePad.displayName = "SignaturePad"

export default SignaturePad
