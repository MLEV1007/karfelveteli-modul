"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import SignaturePad, { type SignaturePadHandle } from "@/components/ui/SignaturePad"
import Button from "@/components/ui/Button"
import { logClientEvent } from "@/lib/clientLog"

// iOS Safari scroll lock: az `overflow: hidden` a body-n iOS-en nem tiltja a háttér
// görgetését / "gumi-sávozását", ezért a body-t `position: fixed`-re rögzítjük, a
// görgetési pozíciót elmentjük, és bezáráskor visszaállítjuk. Több hívás esetén
// számlálóval védett; az unlock idempotens.
const lockState = { count: 0, scrollY: 0, saved: null as Record<string, string> | null }
const LOCKED_PROPS = ["position", "top", "left", "right", "width", "overflow"] as const

function lockBodyScroll(): () => void {
  let released = false
  try {
    const body = document.body
    if (lockState.count === 0) {
      lockState.scrollY = window.scrollY || window.pageYOffset || 0
      lockState.saved = {}
      for (const prop of LOCKED_PROPS) lockState.saved[prop] = body.style[prop]
      body.style.position = "fixed"
      body.style.top = `-${lockState.scrollY}px`
      body.style.left = "0"
      body.style.right = "0"
      body.style.width = "100%"
      body.style.overflow = "hidden"
    }
    lockState.count++
  } catch {
    // ha a body nem érhető el, nincs mit zárolni — az unlock is no-op lesz
    return () => {}
  }

  return () => {
    if (released) return
    released = true
    lockState.count = Math.max(0, lockState.count - 1)
    if (lockState.count > 0) return
    try {
      const body = document.body
      const saved = lockState.saved ?? {}
      for (const prop of LOCKED_PROPS) body.style[prop] = saved[prop] ?? ""
      lockState.saved = null
      window.scrollTo(0, lockState.scrollY)
    } catch {
      // a lock feloldása hibánál se akadjon el
    }
  }
}

interface SignatureModalProps {
  open: boolean
  title: string
  penColor?: string
  onCancel: () => void
  onConfirm: (dataUrl: string) => void
}

export default function SignatureModal({
  open,
  title,
  penColor = "#1e293b",
  onCancel,
  onConfirm,
}: SignatureModalProps) {
  const padRef = useRef<SignaturePadHandle>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [hasDrawing, setHasDrawing] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  // Az onCancel gyakran inline függvény (minden szülő-renderkor új identitás): ref-ben
  // tartjuk, hogy az effect NE fusson újra — különben minden szülő-render újra-zárolná a
  // body-t, és nullázná a hasDrawing állapotot egy folyamatban lévő rajz alatt.
  const onCancelRef = useRef(onCancel)
  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  useEffect(() => {
    if (!open) return
    setHasDrawing(false)
    setExportError(null)

    const unlock = lockBodyScroll()

    // Tablet/toll: a húzás közben ne jelölődjön ki szöveg a modalon belül
    const onSelectStart = (e: Event) => {
      if (overlayRef.current && e.target instanceof Node && overlayRef.current.contains(e.target)) {
        e.preventDefault()
      }
    }
    document.addEventListener("selectstart", onSelectStart)
    // A modal háttérén húzás közben ne induljon görgetés / kijelölés (iPad Safari)
    const overlayEl = overlayRef.current
    const onOverlayTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault()
    }
    overlayEl?.addEventListener("touchmove", onOverlayTouchMove, { passive: false })

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelRef.current()
    }
    // bfcache-ből visszatérve / navigáció közben se maradjon zárolva az oldal
    const onPageHide = () => unlock()
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("pagehide", onPageHide)

    // Unmount, bezárás vagy renderelési hiba (error boundary) esetén is lefut
    return () => {
      unlock()
      document.removeEventListener("selectstart", onSelectStart)
      overlayEl?.removeEventListener("touchmove", onOverlayTouchMove)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("pagehide", onPageHide)
    }
  }, [open])

  // A Step6Signature-ben ez a komponens dynamic(..., { ssr: false })-szal
  // betöltött fa alatt van, tehát csak kliens oldalon renderelődik - de erre
  // a document-ellenőrzésre azért is szükség van, hogy más kontextusban is
  // biztonságos maradjon a komponens.
  if (!open || typeof document === "undefined") return null

  const handleClear = () => {
    padRef.current?.clear()
    setHasDrawing(false)
    setExportError(null)
  }

  const handleConfirm = () => {
    if (!padRef.current || padRef.current.isEmpty()) return
    const result = padRef.current.exportPng()
    if (!result.ok) {
      // Érthető hibaüzenet a felhasználónak, technikai napló (személyes adat nélkül) a szervernek
      setExportError(result.message)
      logClientEvent(
        result.code === "EMPTY_CANVAS" || result.code === "BLANK_EXPORT"
          ? "signature_export_empty"
          : "signature_export_error",
        { ...result.diagnostics, errorCode: result.code }
      )
      return
    }
    setExportError(null)
    logClientEvent("signature_export_ok", result.diagnostics)
    onConfirm(result.dataUrl)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/60 p-3 sm:p-6 select-none touch-none"
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        touchAction: "none",
      }}
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Bezárás"
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <p className="px-4 pt-3 text-xs text-gray-500 dark:text-gray-400">
          Írja alá az egérrel, digitalizáló táblával vagy érintéssel az alábbi felületen.
        </p>

        <div className="m-4 mt-2 flex-1 overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-white dark:border-gray-600">
          <SignaturePad
            ref={padRef}
            penColor={penColor}
            backgroundColor="white"
            className="h-full w-full"
            onEnd={() => {
              setHasDrawing(true)
              setExportError(null)
            }}
          />
        </div>

        {exportError && (
          <p role="alert" className="px-4 pb-2 text-sm text-red-600 dark:text-red-400">
            {exportError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <Button variant="secondary" type="button" onClick={handleClear}>
            Törlés
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" type="button" onClick={onCancel}>
              Mégse
            </Button>
            <Button variant="primary" type="button" onClick={handleConfirm} disabled={!hasDrawing}>
              Alkalmazom
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
