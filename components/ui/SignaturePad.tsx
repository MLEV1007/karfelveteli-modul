"use client"

import { useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from "react"
import { logClientEvent } from "@/lib/clientLog"

export interface SignatureExportDiagnostics {
  canvasWidth: number
  canvasHeight: number
  points: number
  dataUrlLength: number
}

export type SignatureExportResult =
  | { ok: true; dataUrl: string; diagnostics: SignatureExportDiagnostics }
  | { ok: false; code: string; message: string; diagnostics: SignatureExportDiagnostics }

export interface SignaturePadHandle {
  isEmpty: () => boolean
  clear: () => void
  /** Régi API: a sikeres exportot adja vissza, hiba/üres vászon esetén üres stringet. */
  toDataURL: (type?: string) => string
  /** Átlátszó hátterű, ~1000 px szélességűre skálázott PNG, ellenőrzéssel és magyar hibaüzenettel. */
  exportPng: () => SignatureExportResult
  /** A rögzített pontok száma összesen (diagnosztikához / tesztekhez). */
  getPointCount: () => number
}

interface SignaturePadProps {
  onEnd?: () => void
  penColor?: string
  /** Csak a képernyőn látható háttér; az exportált PNG mindig átlátszó hátterű. */
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

// Export: legfeljebb ennyi px széles PNG (jellemzően 20-60 KB), és az "üres kép" küszöbei.
const MAX_EXPORT_WIDTH = 1000
const MAX_EXPORT_SCALE = 2
const MIN_DATA_URL_LENGTH = 200
const MAX_DATA_URL_LENGTH = 1_500_000
const PNG_PREFIX = "data:image/png;base64,"

const MSG_EMPTY = "Az aláírás üres. Kérjük, rajzoljon aláírást."
const MSG_EXPORT_FAILED =
  "Az aláírás mentése nem sikerült. Kérjük, próbálja újra, vagy frissítse az oldalt."
const MSG_TOO_LARGE = "Az aláírás túl nagy méretű. Kérjük, törölje, és írja alá újra egyszerűbben."

function widthForPressure(pressure: number): number {
  const p = pressure > 0 ? Math.min(pressure, 1) : 0.5
  return BASE_LINE_WIDTH * (MIN_WIDTH_FACTOR + (MAX_WIDTH_FACTOR - MIN_WIDTH_FACTOR) * p)
}

// Az összes vonal kirajzolása egy w x h méretű (logikai) felületre. A vonalvastagság
// `scale`-lel nő (export-nál ≠ 1). A háttérrel NEM foglalkozik (átlátszó marad).
function paintStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: StrokePoint[][],
  w: number,
  h: number,
  scale: number,
  color: string
) {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  for (const stroke of strokes) {
    if (stroke.length === 1) {
      const p = stroke[0]
      ctx.beginPath()
      ctx.arc(p.x * w, p.y * h, (widthForPressure(p.pressure) * scale) / 2, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    for (let i = 1; i < stroke.length; i++) {
      const a = stroke[i - 1]
      const b = stroke[i]
      ctx.lineWidth = widthForPressure(b.pressure) * scale
      ctx.beginPath()
      ctx.moveTo(a.x * w, a.y * h)
      ctx.lineTo(b.x * w, b.y * h)
      ctx.stroke()
    }
  }
}

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
    // Az aláírás vektoros formában (pontok listája, 0..1 arányban a vászon
    // méretéhez) van eltárolva, NEM csak raszterként. Így egy resize (mobil címsor
    // el-/megjelenése, layout-shift, modal méretváltozás) után a teljes aláírás
    // újrarajzolható a tárolt pontokból, és az exportot is ebből készítjük.
    const strokes = useRef<StrokePoint[][]>([])
    const currentStroke = useRef<StrokePoint[]>([])
    // Egyetlen aktív pointer: a többi (tenyér, 2. ujj) figyelmen kívül marad.
    const activePointer = useRef<{ id: number; type: string } | null>(null)
    // A bitmap logikai (CSS px) mérete a legutóbbi setup() szerint; rajzoláskor ezt
    // használjuk, hogy rajzolás közbeni layout-változásnál se torzuljon a vonal.
    const logicalSize = useRef({ w: 0, h: 0 })
    const pendingSetup = useRef(false)
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

      const redrawAll = () => {
        const { w, h } = logicalSize.current
        const ctx = canvas.getContext("2d")
        if (!ctx || w === 0 || h === 0) return
        ctx.clearRect(0, 0, w, h)
        ctx.fillStyle = backgroundColorRef.current
        ctx.fillRect(0, 0, w, h)
        paintStrokes(ctx, strokes.current, w, h, 1, penColorRef.current)
      }

      // A canvas bitmapjának (újra)méretezése. FIGYELEM: a canvas.width értékadás
      // törli a vásznat, ezért rajzolás közben NEM futhat — ilyenkor a vonal végéig
      // (finishStroke) halasztjuk.
      const setup = () => {
        if (activePointer.current) {
          if (!pendingSetup.current) {
            logClientEvent("signature_resize_deferred", {
              canvasWidth: logicalSize.current.w,
              canvasHeight: logicalSize.current.h,
              points: currentStroke.current.length,
            })
          }
          pendingSetup.current = true
          return
        }
        pendingSetup.current = false
        const rect = canvas.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return
        const dpr = window.devicePixelRatio || 1
        const pw = Math.round(rect.width * dpr)
        const ph = Math.round(rect.height * dpr)
        if (
          canvas.width === pw &&
          canvas.height === ph &&
          logicalSize.current.w === rect.width &&
          logicalSize.current.h === rect.height
        ) {
          return // semmi nem változott, ne töröljük feleslegesen a vásznat
        }
        canvas.width = pw
        canvas.height = ph
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        logicalSize.current = { w: rect.width, h: rect.height }
        redrawAll()
      }

      setup()

      const observer = new ResizeObserver(() => setup())
      observer.observe(canvas)

      const addPoint = (ev: PointerEvent, rect: DOMRect) => {
        if (rect.width === 0 || rect.height === 0) return
        // Egérnél a pressure szabvány szerint 0 vagy 0.5 attól függően, hogy
        // nyomva van-e gomb - nem valós nyomásadat, ezért mindig 0.5-öt
        // (állandó vastagság) használunk. Tollnál/érintésnél a valós
        // pressure-t vesszük, 0-nál (nem nyomásérzékeny olcsó tábláknál is
        // gyakori) 0.5-re esünk vissza.
        const pressure = ev.pointerType === "mouse" ? 0.5 : ev.pressure > 0 ? ev.pressure : 0.5
        currentStroke.current.push({
          x: (ev.clientX - rect.left) / rect.width,
          y: (ev.clientY - rect.top) / rect.height,
          pressure,
        })
      }

      const drawLatestSegment = (ctx: CanvasRenderingContext2D) => {
        const stroke = currentStroke.current
        const n = stroke.length
        const { w, h } = logicalSize.current
        if (n < 2 || w === 0) return
        const a = stroke[n - 2]
        const b = stroke[n - 1]
        ctx.strokeStyle = penColorRef.current
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.lineWidth = widthForPressure(b.pressure)
        ctx.beginPath()
        ctx.moveTo(a.x * w, a.y * h)
        ctx.lineTo(b.x * w, b.y * h)
        ctx.stroke()
      }

      const releaseCapture = (id: number) => {
        try {
          if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id)
        } catch {
          // a pointer már nem létezik — nem gond
        }
      }

      // Az aktuális (még be nem fejezett) vonal eldobása, pl. ha a tenyér kezdett rajzolni,
      // majd megjelent a toll. A már kész vonalak maradnak, a vászon újrarajzolódik.
      const discardCurrentStroke = () => {
        const active = activePointer.current
        activePointer.current = null
        currentStroke.current = []
        if (active) releaseCapture(active.id)
        redrawAll()
        if (pendingSetup.current) setup()
      }

      const finishStroke = (reason: "up" | "cancel" | "lost" | "blur") => {
        const active = activePointer.current
        if (!active) return
        activePointer.current = null
        const stroke = currentStroke.current
        currentStroke.current = []
        releaseCapture(active.id)

        if (reason !== "up") {
          logClientEvent("signature_pointer_lost", {
            canvasWidth: logicalSize.current.w,
            canvasHeight: logicalSize.current.h,
            points: stroke.length,
            errorCode: `END_${reason.toUpperCase()}`,
          })
        }

        if (stroke.length > 0) {
          strokes.current.push(stroke)
        }
        // Ha rajzolás közben jött átméretezés, most futtatjuk le: a setup() a tárolt
        // vektoros pontokból (az éppen lezárt vonallal együtt) újrarajzol mindent.
        if (pendingSetup.current) {
          setup()
        } else if (stroke.length === 1) {
          // Egyetlen koppintás mozgatás nélkül - rajzoljunk egy pontot, hogy ne
          // tűnjön el nyomtalanul (pl. egy "i" pöttye).
          const ctx = canvas.getContext("2d")
          const { w, h } = logicalSize.current
          if (ctx && w > 0) {
            ctx.fillStyle = penColorRef.current
            ctx.beginPath()
            ctx.arc(
              stroke[0].x * w,
              stroke[0].y * h,
              widthForPressure(stroke[0].pressure) / 2,
              0,
              Math.PI * 2
            )
            ctx.fill()
          }
        }
        if (stroke.length > 0) onEndRef.current?.()
      }

      const onDown = (e: PointerEvent) => {
        // Egérnél csak a bal gomb rajzol
        if (e.pointerType === "mouse" && e.button !== 0) return
        e.preventDefault()
        // Tabletnél (toll/ujj) a böngésző a tartás/húzás közben szöveget is kijelölhet
        // a környező oldalon: a már létrejött kijelölést azonnal eldobjuk.
        try {
          window.getSelection()?.removeAllRanges()
        } catch {
          // nem minden környezetben érhető el — nem gond
        }

        const active = activePointer.current
        if (active) {
          if (e.pointerType === "pen" && active.type !== "pen") {
            // Toll elsőbbséget élvez: a tenyér/ujj eddigi vonalát eldobjuk
            discardCurrentStroke()
          } else {
            return // másodlagos pointer (tenyér, 2. ujj): figyelmen kívül
          }
        }

        activePointer.current = { id: e.pointerId, type: e.pointerType }
        try {
          canvas.setPointerCapture(e.pointerId)
        } catch {
          // Nem minden környezetben sikerül (pl. szintetikus esemény) — a window-szintű
          // pointerup/pointercancel figyelő ilyenkor is lezárja a vonalat.
        }
        currentStroke.current = []
        addPoint(e, canvas.getBoundingClientRect())
      }

      const onMove = (e: PointerEvent) => {
        const active = activePointer.current
        if (!active || e.pointerId !== active.id) return
        e.preventDefault()
        // Elveszett egér-felengedés (pl. az ablakon kívül): ne ragadjon be a vonal
        if (e.pointerType === "mouse" && e.buttons === 0) {
          finishStroke("lost")
          return
        }
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const rect = canvas.getBoundingClientRect()
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
          drawLatestSegment(ctx)
        }
      }

      // A vonalat KIZÁRÓLAG pointerup / pointercancel / lostpointercapture zárja le.
      // A pointerleave szándékosan nincs: pointer capture mellett a kurzor/ujj elhagyhatja
      // a vásznat, és a vonalnak ilyenkor is folytatódnia kell.
      const makeEndHandler = (reason: "up" | "cancel" | "lost") => (e: PointerEvent) => {
        const active = activePointer.current
        if (!active || e.pointerId !== active.id) return
        if (reason === "up") e.preventDefault()
        finishStroke(reason)
      }
      const onUp = makeEndHandler("up")
      const onCancel = makeEndHandler("cancel")
      const onLost = makeEndHandler("lost")
      const onBlur = () => finishStroke("blur")
      const onContextMenu = (e: Event) => e.preventDefault()
      const onSelectStart = (e: Event) => e.preventDefault()
      // iPad Safari / Android: a sima érintés-események (nem a pointer-ek) indíthatnak
      // kijelölést, nagyítót vagy húzást. Ezeket a vásznon is le kell tiltani.
      const onTouch = (e: TouchEvent) => {
        if (e.cancelable) e.preventDefault()
      }

      canvas.addEventListener("pointerdown", onDown)
      canvas.addEventListener("pointermove", onMove)
      canvas.addEventListener("pointerup", onUp)
      canvas.addEventListener("pointercancel", onCancel)
      canvas.addEventListener("lostpointercapture", onLost)
      canvas.addEventListener("contextmenu", onContextMenu)
      canvas.addEventListener("selectstart", onSelectStart)
      canvas.addEventListener("touchstart", onTouch, { passive: false })
      canvas.addEventListener("touchmove", onTouch, { passive: false })
      // Tartalék, ha a pointer capture nem sikerült: a felengedés a vászonon kívül is lezár
      window.addEventListener("pointerup", onUp)
      window.addEventListener("pointercancel", onCancel)
      window.addEventListener("blur", onBlur)

      return () => {
        observer.disconnect()
        canvas.removeEventListener("pointerdown", onDown)
        canvas.removeEventListener("pointermove", onMove)
        canvas.removeEventListener("pointerup", onUp)
        canvas.removeEventListener("pointercancel", onCancel)
        canvas.removeEventListener("lostpointercapture", onLost)
        canvas.removeEventListener("contextmenu", onContextMenu)
        canvas.removeEventListener("selectstart", onSelectStart)
        canvas.removeEventListener("touchstart", onTouch)
        canvas.removeEventListener("touchmove", onTouch)
        window.removeEventListener("pointerup", onUp)
        window.removeEventListener("pointercancel", onCancel)
        window.removeEventListener("blur", onBlur)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useImperativeHandle(ref, () => {
      const countPoints = () => strokes.current.reduce((sum, s) => sum + s.length, 0)

      const exportPng = (): SignatureExportResult => {
        const { w, h } = logicalSize.current
        const diagnostics: SignatureExportDiagnostics = {
          canvasWidth: Math.round(w),
          canvasHeight: Math.round(h),
          points: countPoints(),
          dataUrlLength: 0,
        }
        const fail = (code: string, message: string): SignatureExportResult => ({
          ok: false,
          code,
          message,
          diagnostics,
        })

        if (strokes.current.length === 0) return fail("EMPTY_CANVAS", MSG_EMPTY)
        if (w === 0 || h === 0) return fail("NO_CANVAS", MSG_EXPORT_FAILED)

        try {
          // Külön, átlátszó hátterű vászonra rajzolunk a vektoros pontokból, legfeljebb
          // ~1000 px szélességre skálázva — így a kép kicsi (jellemzően 20-60 KB), és a
          // PDF-ben/e-mailben háttér nélkül is olvasható.
          const scale = Math.min(MAX_EXPORT_WIDTH / w, MAX_EXPORT_SCALE)
          const outW = Math.max(1, Math.round(w * scale))
          const outH = Math.max(1, Math.round(h * scale))
          const out = document.createElement("canvas")
          out.width = outW
          out.height = outH
          const ctx = out.getContext("2d", { willReadFrequently: true })
          if (!ctx) return fail("NO_CONTEXT", MSG_EXPORT_FAILED)
          paintStrokes(ctx, strokes.current, outW, outH, scale, penColorRef.current)

          const dataUrl = out.toDataURL("image/png")
          diagnostics.dataUrlLength = dataUrl.length
          // A túl nagy vászon (iOS memóriakorlát) vagy hiba "data:," -t ad vissza
          if (!dataUrl.startsWith(PNG_PREFIX) || dataUrl.length < MIN_DATA_URL_LENGTH) {
            return fail("ENCODE_FAILED", MSG_EXPORT_FAILED)
          }
          if (dataUrl.length > MAX_DATA_URL_LENGTH) return fail("TOO_LARGE", MSG_TOO_LARGE)

          // Legyen legalább egy nem átlátszó pixel (különben a kép üres)
          const pixels = ctx.getImageData(0, 0, outW, outH).data
          let inked = false
          for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] > 0) {
              inked = true
              break
            }
          }
          if (!inked) return fail("BLANK_EXPORT", MSG_EMPTY)

          return { ok: true, dataUrl, diagnostics }
        } catch {
          return fail("EXPORT_EXCEPTION", MSG_EXPORT_FAILED)
        }
      }

      return {
        isEmpty: () => strokes.current.length === 0,
        clear: () => {
          strokes.current = []
          currentStroke.current = []
          activePointer.current = null
          const canvas = canvasRef.current
          if (!canvas) return
          const { w, h } = logicalSize.current
          const ctx = canvas.getContext("2d")
          if (!ctx || w === 0) return
          ctx.clearRect(0, 0, w, h)
          ctx.fillStyle = backgroundColorRef.current
          ctx.fillRect(0, 0, w, h)
        },
        toDataURL: () => {
          const r = exportPng()
          return r.ok ? r.dataUrl : ""
        },
        exportPng,
        getPointCount: countPoints,
      }
    })

    return (
      <canvas
        ref={canvasRef}
        className={className}
        data-testid="signature-canvas"
        onDragStart={(e) => e.preventDefault()}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          WebkitTapHighlightColor: "transparent",
          cursor: cursorStyle,
        }}
      />
    )
  }
)

SignaturePad.displayName = "SignaturePad"

export default SignaturePad
