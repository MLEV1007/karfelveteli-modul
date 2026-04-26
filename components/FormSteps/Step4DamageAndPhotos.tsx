"use client"

import { useRef, useState } from "react"
import { z } from "zod"
import Textarea from "@/components/ui/Textarea"
import Input from "@/components/ui/Input"
import Button from "@/components/ui/Button"

export const step4Schema = z.object({
  damageDescription: z
    .string()
    .min(20, "Kérjük részletesebben írja le (min. 20 karakter)"),
  damagePoints: z
    .array(
      z.object({
        x: z.number(),
        y: z.number(),
        dx: z.number(),
        dy: z.number(),
        label: z.string(),
      })
    )
    .optional(),
  photoUrls: z.array(z.string()).optional(),
})

export type Step4Data = {
  damageDescription: string
  damagePoints: { x: number; y: number; dx: number; dy: number; label: string }[]
  photoUrls: string[]
}

type Props = {
  data: Step4Data
  onChange: (field: string, value: unknown) => void
  errors: Record<string, string>
}

type DragState = {
  active: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
}

const SVG_W = 400
const SVG_H = 300 // Megnövelt magasság, hogy könnyebb legyen az autó elejét/végét jelölni
const MIN_DRAG = 8 // px-ben a viewBox koordinátatérben

// Autó határai a viewBox koordinátarendszerben
// Az autó path mérete: ~35x47, skalázva 3.8x, translate(111, 61)
// Vertikálisan centráltuk: (300 - 47*3.8) / 2 ≈ 61
const CAR_BOUNDS = {
  minX: 111 + 12 * 3.8, // bal oldal + kis belső margó
  maxX: 111 + 35 * 3.8, // jobb oldal
  minY: 61, // felső (centrált)
  maxY: 61 + 47 * 3.8, // alsó
}

export default function Step4DamageAndPhotos({ data, onChange, errors }: Props) {
  const [uploading, setUploading] = useState<boolean[]>([])
  const [uploadError, setUploadError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [pointValidationError, setPointValidationError] = useState("")

  const [drag, setDrag] = useState<DragState>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  })

  // Ellenőrzi, hogy a pont az autó területén belül van-e
  const isPointOnCar = (x: number, y: number): boolean => {
    return (
      x >= CAR_BOUNDS.minX &&
      x <= CAR_BOUNDS.maxX &&
      y >= CAR_BOUNDS.minY &&
      y <= CAR_BOUNDS.maxY
    )
  }

  // SVG koordináta-kiszámítás az elemhez képest
  const toSvgCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: Math.round(((clientX - rect.left) / rect.width) * SVG_W),
      y: Math.round(((clientY - rect.top) / rect.height) * SVG_H),
    }
  }

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y } = toSvgCoords(e.clientX, e.clientY)
    setDrag({ active: true, startX: x, startY: y, currentX: x, currentY: y })
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.active) return
    const { x, y } = toSvgCoords(e.clientX, e.clientY)
    setDrag((prev) => ({ ...prev, currentX: x, currentY: y }))
  }

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.active) return
    e.currentTarget.releasePointerCapture(e.pointerId)

    const { startX, startY, currentX, currentY } = drag
    const dx = currentX - startX
    const dy = currentY - startY
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Ha pont lesz (nem nyíl), akkor csak az autón belül engedjük
    const isArrow = dist >= MIN_DRAG
    if (!isArrow && !isPointOnCar(startX, startY)) {
      // Pont az autón kívül - nem mentjük, hibaüzenetet mutatunk
      setPointValidationError("Csak az autón lehet sérülést bejelölni")
      setDrag({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 })
      
      // 3 másodperc után eltűnik az üzenet
      setTimeout(() => setPointValidationError(""), 3000)
      return
    }

    const newPoint = {
      x: startX,
      y: startY,
      dx: isArrow ? dx : 0,
      dy: isArrow ? dy : 0,
      label: `${data.damagePoints.length + 1}. pont`,
    }

    // Sikeres jelölés - töröljük az esetleges hibát
    setPointValidationError("")
    onChange("damagePoints", [...data.damagePoints, newPoint])
    setDrag({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 })
  }

  const handlePointerCancel = () => {
    setDrag({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 })
  }

  const removePoint = (index: number) => {
    const updated = data.damagePoints
      .filter((_, i) => i !== index)
      .map((p, i) => ({ ...p, label: `${i + 1}. pont` }))
    onChange("damagePoints", updated)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setUploadError("")

    if (data.photoUrls.length + files.length > 5) {
      setUploadError("Legfeljebb 5 fotó tölthető fel összesen")
      return
    }

    setUploading(files.map(() => true))

    try {
      // 1. Presigned URL-ek kérése a szervertől
      const res = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: files.map((f) => ({ contentType: f.type || "image/jpeg" })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setUploadError(err.error ?? "Feltöltési hiba")
        setUploading([])
        return
      }

      const { urls } = await res.json() as {
        urls: { uploadUrl: string; publicUrl: string }[]
      }

      // 2. Közvetlen feltöltés az R2-re presigned URL-lel
      const uploadedUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const putRes = await fetch(urls[i].uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": files[i].type || "image/jpeg" },
          body: files[i],
        })

        if (!putRes.ok) {
          setUploadError(`A ${i + 1}. fájl feltöltése sikertelen`)
          setUploading([])
          if (fileInputRef.current) fileInputRef.current.value = ""
          return
        }

        uploadedUrls.push(urls[i].publicUrl)
        setUploading((prev) => {
          const next = [...prev]
          next[i] = false
          return next
        })
      }

      onChange("photoUrls", [...data.photoUrls, ...uploadedUrls])
    } catch {
      setUploadError("Hálózati hiba a feltöltés során. Kérjük próbálja újra.")
      setUploading([])
    }

    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removePhoto = (index: number) => {
    onChange(
      "photoUrls",
      data.photoUrls.filter((_, i) => i !== index)
    )
  }

  // Húzás közbeni preview nyíl dx/dy
  const previewDx = drag.currentX - drag.startX
  const previewDy = drag.currentY - drag.startY
  const previewDist = Math.sqrt(previewDx * previewDx + previewDy * previewDy)

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Kár leírása és sérülés jelölése
      </h2>

      {/* Szöveges leírás */}
      <Textarea
        label="Kár leírása"
        name="damageDescription"
        value={data.damageDescription}
        onChange={(e) => onChange("damageDescription", e.target.value)}
        error={errors.damageDescription}
        required
        placeholder="Kérjük részletesen írja le a bekövetkezett kárt..."
        rows={4}
      />

      {/* Interaktív jármű diagram */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Jelölje be a sérülés helyét és irányát (opcionális)
        </p>
        <div className="flex gap-3 mb-3">
          <div className="flex-1 flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2">
            <svg width="36" height="36" viewBox="0 0 36 36" className="flex-shrink-0">
              <circle cx="18" cy="18" r="9" fill="#ef4444" />
              <text x="18" y="22" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">1</text>
            </svg>
            <div>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Kattintás</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Sérülés helyének megjelölése</p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-lg px-3 py-2">
            <svg width="36" height="36" viewBox="0 0 36 36" className="flex-shrink-0">
              <defs>
                <marker id="tip" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                  <path d="M0,0 L0,5 L5,2.5 z" fill="#f97316" />
                </marker>
              </defs>
              <circle cx="8" cy="28" r="4" fill="#f97316" />
              <line x1="10" y1="26" x2="26" y2="10" stroke="#f97316" strokeWidth="2.5" markerEnd="url(#tip)" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Kattintás + húzás</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Becsapódás irányának jelölése</p>
            </div>
          </div>
        </div>
        <div className="border rounded-xl overflow-hidden bg-white dark:bg-gray-800 touch-none">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full select-none cursor-crosshair"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            <defs>
              {/* Nyílhegy marker a mentett pontokhoz */}
              <marker
                id="arrowhead"
                markerWidth="6"
                markerHeight="6"
                refX="3"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L6,3 z" fill="#ef4444" />
              </marker>
              {/* Nyílhegy marker a preview nyílhoz */}
              <marker
                id="arrowhead-preview"
                markerWidth="6"
                markerHeight="6"
                refX="3"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L6,3 z" fill="#f97316" opacity="0.7" />
              </marker>
            </defs>

            {/* Jármű felülnézeti kép */}
            <g
              transform="translate(111, 61) scale(3.8)"
              fill="#9ca3af"
              stroke="#6b7280"
              strokeWidth={0.2}
            >
              <path d="M29.395,0H17.636c-3.117,0-5.643,3.467-5.643,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759
                c3.116,0,5.644-2.527,5.644-5.644V6.584C35.037,3.467,32.511,0,29.395,0z M34.05,14.188v11.665l-2.729,0.351v-4.806
                L34.05,14.188z M32.618,10.773c-1.016,3.9-2.219,8.51-2.219,8.51H16.631l-2.222-8.51
                C14.41,10.773,23.293,7.755,32.618,10.773z M15.741,21.713v4.492l-2.73-0.349V14.502L15.741,21.713z
                M13.011,37.938V27.579l2.73,0.343v8.196L13.011,37.938z M14.568,40.882l2.218-3.336h13.771l2.219,3.336H14.568z
                M31.321,35.805v-7.872l2.729-0.355v10.048L31.321,35.805z" />
            </g>

            {/* Tájékoztató feliratok */}
            <text x={200} y={52} fontSize={12} fill="#6b7280" fontWeight="bold" textAnchor="middle">⬆ ELÖL (ORR)</text>
            <text x={200} y={282} fontSize={12} fill="#6b7280" fontWeight="bold" textAnchor="middle">HÁTUL (FAR) ⬇</text>

            {/* Mentett pontok / nyilak */}
            {data.damagePoints.map((pt, i) => {
              const hasArrow = pt.dx !== 0 || pt.dy !== 0
              return (
                <g key={i}>
                  {hasArrow ? (
                    <>
                      <line
                        x1={pt.x}
                        y1={pt.y}
                        x2={pt.x + pt.dx}
                        y2={pt.y + pt.dy}
                        stroke="#ef4444"
                        strokeWidth={2.5}
                        markerEnd="url(#arrowhead)"
                      />
                      <circle cx={pt.x} cy={pt.y} r={5} fill="#ef4444" />
                    </>
                  ) : (
                    <circle cx={pt.x} cy={pt.y} r={8} fill="#ef4444" />
                  )}
                  <text
                    x={hasArrow ? pt.x - 8 : pt.x}
                    y={hasArrow ? pt.y - 8 : pt.y + 4}
                    textAnchor="middle"
                    fontSize={9}
                    fill={hasArrow ? "#ef4444" : "white"}
                    fontWeight="bold"
                  >
                    {i + 1}
                  </text>
                </g>
              )
            })}

            {/* Húzás közbeni preview */}
            {drag.active && previewDist >= MIN_DRAG && (
              <g>
                <line
                  x1={drag.startX}
                  y1={drag.startY}
                  x2={drag.currentX}
                  y2={drag.currentY}
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  opacity={0.7}
                  markerEnd="url(#arrowhead-preview)"
                />
                <circle cx={drag.startX} cy={drag.startY} r={4} fill="#f97316" opacity={0.7} />
              </g>
            )}
            {drag.active && previewDist < MIN_DRAG && (
              <circle
                cx={drag.startX}
                cy={drag.startY}
                r={8}
                fill="#f97316"
                opacity={0.5}
              />
            )}
          </svg>
        </div>

        {/* Validációs hiba az autón kívüli pontokhoz */}
        {pointValidationError && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{pointValidationError}</span>
          </div>
        )}

        {data.damagePoints.length > 0 && (
          <div className="mt-3 space-y-1">
            {data.damagePoints.map((pt, i) => {
              const hasArrow = pt.dx !== 0 || pt.dy !== 0
              return (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
                >
                  <span>
                    {i + 1}. pont {hasArrow ? "— nyíllal (irány jelölve)" : "— pont"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePoint(i)}
                    className="text-red-500 hover:text-red-700 ml-2 font-medium"
                    aria-label="Törlés"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
            <div className="pt-1">
              <Button
                variant="secondary"
                onClick={() => onChange("damagePoints", [])}
                type="button"
              >
                Jelölők törlése
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Képfeltöltés */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Fotók a kárról (max. 5)
        </p>

        {data.photoUrls.length < 5 && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <span className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Képek kiválasztása
            </span>
          </label>
        )}

        {uploadError && (
          <p className="text-sm text-red-600 mt-1">{uploadError}</p>
        )}

        {uploading.some(Boolean) && (
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Feltöltés folyamatban...
          </div>
        )}

        {data.photoUrls.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-3">
            {data.photoUrls.map((url, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Kép ${i + 1}`}
                  className="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none hover:bg-red-600"
                  aria-label="Kép törlése"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
