"use client"

import { useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from "react"

export interface SignaturePadHandle {
  isEmpty: () => boolean
  clear: () => void
  toDataURL: (type?: string) => string
}

interface SignaturePadProps {
  onEnd?: () => void
  penColor?: string
  backgroundColor?: string
  className?: string
}

type StrokePoint = { x: number; y: number; pressure: number }

// A vonalvastagság alsó/felső szorzója a nyomás (pressure) alapján.
// Nem nyomásérzékeny eszközöknél (egér, sok olcsó tábla) a pressure
// mindig 0.5-nek van véve, ami egy állandó, középső vastagságot ad.
const BASE_LINE_WIDTH = 2.4
const MIN_WIDTH_FACTOR = 0.6
const MAX_WIDTH_FACTOR = 1.7

// Toll alakú egérkurzor (Material "edit" ikon), a hegye a bal-alsó csúcsban
// van (kb. a path (3,21) pontja) - ez lesz a kurzor "hotspot"-ja, hogy a
// vizuális hegy pontosan ott legyen, ahova a rajzolás ténylegesen történik.
function buildPenCursor(color: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path fill='${color}' stroke='white' stroke-width='0.6' d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 3 21, crosshair`
}

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  ({ onEnd, penColor = "#1e293b", backgroundColor = "white", className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDrawing = useRef(false)
    // Az aláírás vektoros formában (pontok listája, 0..1 arányban a vászon
    // méretéhez) van eltárolva, NEM csak raszterként. Ez azért fontos, mert
    // így egy resize (pl. mobil címsor el-/megjelenése, layout-shift, vagy a
    // modal méretének változása) esetén a teljes aláírás újrarajzolható a
    // tárolt pontokból - korábban a canvas resize-kor egyszerűen törölte a
    // rajzot, ami néma aláírás-elvesztést okozott.
    const strokes = useRef<StrokePoint[][]>([])
    const currentStroke = useRef<StrokePoint[]>([])
    const onEndRef = useRef(onEnd)
    const penColorRef = useRef(penColor)
    const backgroundColorRef = useRef(backgroundColor)

    useEffect(() => {
      onEndRef.current = onEnd
    }, [onEnd])

    useEffect(() => {
      penColorRef.current = penColor
      backgroundColorRef.current = backgroundColor
    }, [penColor, backgroundColor])

    const cursorStyle = useMemo(() => buildPenCursor(penColor), [penColor])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const widthForPressure = (pressure: number) => {
        const p = pressure > 0 ? Math.min(pressure, 1) : 0.5
        return BASE_LINE_WIDTH * (MIN_WIDTH_FACTOR + (MAX_WIDTH_FACTOR - MIN_WIDTH_FACTOR) * p)
      }

      const redrawAll = () => {
        const rect = canvas.getBoundingClientRect()
        const ctx = canvas.getContext("2d")
        if (!ctx || rect.width === 0 || rect.height === 0) return
        ctx.fillStyle = backgroundColorRef.current
        ctx.fillRect(0, 0, rect.width, rect.height)
        ctx.strokeStyle = penColorRef.current
        ctx.fillStyle = penColorRef.current
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        for (const stroke of strokes.current) {
          if (stroke.length === 1) {
            const p = stroke[0]
            ctx.beginPath()
            ctx.arc(p.x * rect.width, p.y * rect.height, widthForPressure(p.pressure) / 2, 0, Math.PI * 2)
            ctx.fill()
            continue
          }
          for (let i = 1; i < stroke.length; i++) {
            const a = stroke[i - 1]
            const b = stroke[i]
            ctx.lineWidth = widthForPressure(b.pressure)
            ctx.beginPath()
            ctx.moveTo(a.x * rect.width, a.y * rect.height)
            ctx.lineTo(b.x * rect.width, b.y * rect.height)
            ctx.stroke()
          }
        }
      }

      const setup = () => {
        const rect = canvas.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return
        const dpr = window.devicePixelRatio || 1
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.scale(dpr, dpr)
        redrawAll()
      }

      setup()

      const observer = new ResizeObserver(() => setup())
      observer.observe(canvas)

      const addPoint = (ev: PointerEvent, rect: DOMRect): StrokePoint => {
        const xFrac = (ev.clientX - rect.left) / rect.width
        const yFrac = (ev.clientY - rect.top) / rect.height
        // Egérnél a pressure szabvány szerint 0 vagy 0.5 attól függően, hogy
        // nyomva van-e gomb - nem valós nyomásadat, ezért mindig 0.5-öt
        // (állandó vastagság) használunk. Tollnál/érintésnél a valós
        // pressure-t vesszük, 0-nál (nem nyomásérzékeny olcsó tábláknál is
        // gyakori) 0.5-re esünk vissza.
        const pressure = ev.pointerType === "mouse" ? 0.5 : ev.pressure > 0 ? ev.pressure : 0.5
        const point: StrokePoint = { x: xFrac, y: yFrac, pressure }
        currentStroke.current.push(point)
        return point
      }

      const drawLatestSegment = (ctx: CanvasRenderingContext2D, rect: DOMRect) => {
        const stroke = currentStroke.current
        const n = stroke.length
        if (n < 2) return
        const a = stroke[n - 2]
        const b = stroke[n - 1]
        ctx.strokeStyle = penColorRef.current
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.lineWidth = widthForPressure(b.pressure)
        ctx.beginPath()
        ctx.moveTo(a.x * rect.width, a.y * rect.height)
        ctx.lineTo(b.x * rect.width, b.y * rect.height)
        ctx.stroke()
      }

      const onDown = (e: PointerEvent) => {
        e.preventDefault()
        canvas.setPointerCapture(e.pointerId)
        isDrawing.current = true
        currentStroke.current = []
        const rect = canvas.getBoundingClientRect()
        addPoint(e, rect)
      }

      const onMove = (e: PointerEvent) => {
        e.preventDefault()
        if (!isDrawing.current) return
        const rect = canvas.getBoundingClientRect()
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        // A legtöbb digitalizáló tábla 130-200Hz-en mintavételez, de a
        // böngésző alapból csak a repaint-hez igazítva (kb. 60Hz) tüzeli a
        // pointermove eseményt - enélkül gyors mozdulatnál szögletes,
        // darabos lenne a vonal. A getCoalescedEvents visszaadja a köztes,
        // "elnyelt" pontokat is, így sima marad az írás. Ahol a böngésző nem
        // támogatja (pl. régebbi Safari), egyszerűen csak a kapott eseményt
        // használjuk.
        const coalesced = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : []
        const events = coalesced.length > 0 ? coalesced : [e]
        for (const ev of events) {
          addPoint(ev, rect)
          drawLatestSegment(ctx, rect)
        }
      }

      const finishStroke = () => {
        if (!isDrawing.current) return
        isDrawing.current = false
        const stroke = currentStroke.current
        if (stroke.length === 1) {
          // Egyetlen kattintás/koppintás mozgatás nélkül - rajzoljunk egy
          // pontot, hogy ne tűnjön el nyomtalanul (pl. egy "i" pöttye).
          const rect = canvas.getBoundingClientRect()
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.fillStyle = penColorRef.current
            ctx.beginPath()
            ctx.arc(
              stroke[0].x * rect.width,
              stroke[0].y * rect.height,
              widthForPressure(stroke[0].pressure) / 2,
              0,
              Math.PI * 2
            )
            ctx.fill()
          }
        }
        if (stroke.length > 0) {
          strokes.current.push(stroke)
        }
        currentStroke.current = []
        onEndRef.current?.()
      }

      const onUp = (e: PointerEvent) => {
        e.preventDefault()
        finishStroke()
      }

      canvas.addEventListener("pointerdown", onDown)
      canvas.addEventListener("pointermove", onMove)
      canvas.addEventListener("pointerup", onUp)
      canvas.addEventListener("pointercancel", onUp)
      canvas.addEventListener("pointerleave", onUp)

      return () => {
        observer.disconnect()
        canvas.removeEventListener("pointerdown", onDown)
        canvas.removeEventListener("pointermove", onMove)
        canvas.removeEventListener("pointerup", onUp)
        canvas.removeEventListener("pointercancel", onUp)
        canvas.removeEventListener("pointerleave", onUp)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useImperativeHandle(ref, () => ({
      isEmpty: () => strokes.current.length === 0,
      clear: () => {
        strokes.current = []
        currentStroke.current = []
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.fillStyle = backgroundColorRef.current
        ctx.fillRect(0, 0, rect.width, rect.height)
      },
      toDataURL: (type = "image/png") => canvasRef.current?.toDataURL(type) ?? "",
    }))

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          touchAction: "none",
          cursor: cursorStyle,
        }}
      />
    )
  }
)

SignaturePad.displayName = "SignaturePad"

export default SignaturePad
