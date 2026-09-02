"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import SignaturePad, { type SignaturePadHandle } from "@/components/ui/SignaturePad"
import Button from "@/components/ui/Button"

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
  const [hasDrawing, setHasDrawing] = useState(false)

  useEffect(() => {
    if (!open) return
    setHasDrawing(false)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onCancel])

  // A Step6Signature-ben ez a komponens dynamic(..., { ssr: false })-szal
  // betöltött fa alatt van, tehát csak kliens oldalon renderelődik - de erre
  // a document-ellenőrzésre azért is szükség van, hogy más kontextusban is
  // biztonságos maradjon a komponens.
  if (!open || typeof document === "undefined") return null

  const handleClear = () => {
    padRef.current?.clear()
    setHasDrawing(false)
  }

  const handleConfirm = () => {
    if (!padRef.current || padRef.current.isEmpty()) return
    onConfirm(padRef.current.toDataURL("image/png"))
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/60 p-3 sm:p-6"
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
            onEnd={() => setHasDrawing(true)}
          />
        </div>

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
