"use client"

import { useRef, useEffect, forwardRef, useImperativeHandle } from "react"

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
    const onEndRef = useRef(onEnd)

    useEffect(() => {
      onEndRef.current = onEnd
    }, [onEnd])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const setup = () => {
        const rect = canvas.getBoundingClientRect()
        if (rect.width === 0) return
        const dpr = window.devicePixelRatio || 1
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        const ctx = canvas.getContext("2d")!
        ctx.scale(dpr, dpr)
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, rect.width, rect.height)
        ctx.strokeStyle = penColor
        ctx.lineWidth = 2
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        isEmpty.current = true
      }

      setup()

      const observer = new ResizeObserver(setup)
      observer.observe(canvas)

      const getPos = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect()
        return { x: e.clientX - rect.left, y: e.clientY - rect.top }
      }

      const onDown = (e: PointerEvent) => {
        e.preventDefault()
        canvas.setPointerCapture(e.pointerId)
        isDrawing.current = true
        const ctx = canvas.getContext("2d")!
        const { x, y } = getPos(e)
        ctx.beginPath()
        ctx.moveTo(x, y)
      }

      const onMove = (e: PointerEvent) => {
        e.preventDefault()
        if (!isDrawing.current) return
        const ctx = canvas.getContext("2d")!
        const { x, y } = getPos(e)
        ctx.lineTo(x, y)
        ctx.stroke()
        isEmpty.current = false
      }

      const onUp = (e: PointerEvent) => {
        e.preventDefault()
        if (!isDrawing.current) return
        isDrawing.current = false
        canvas.getContext("2d")!.closePath()
        onEndRef.current?.()
      }

      canvas.addEventListener("pointerdown", onDown)
      canvas.addEventListener("pointermove", onMove)
      canvas.addEventListener("pointerup", onUp)
      canvas.addEventListener("pointerleave", onUp)

      return () => {
        observer.disconnect()
        canvas.removeEventListener("pointerdown", onDown)
        canvas.removeEventListener("pointermove", onMove)
        canvas.removeEventListener("pointerup", onUp)
        canvas.removeEventListener("pointerleave", onUp)
      }
    }, [backgroundColor, penColor])

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
      toDataURL: (type = "image/png") => canvasRef.current?.toDataURL(type) ?? "",
    }))

    return (
      <canvas
        ref={canvasRef}
        style={{ height, width: "100%", display: "block", touchAction: "none" }}
      />
    )
  }
)

SignaturePad.displayName = "SignaturePad"

export default SignaturePad
