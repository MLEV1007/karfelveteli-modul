"use client"

import { useRef, useState } from "react"
import SignaturePad, { type SignaturePadHandle } from "@/components/ui/SignaturePad"

// E2E tesztoldal: a SignaturePad-et egy szabályozható szélességű dobozban mutatja, és
// az export eredményét (kép + diagnosztika) data-testid-es elemekben teszi közzé.
export default function SignatureDemo() {
  const padRef = useRef<SignaturePadHandle>(null)
  const [width, setWidth] = useState(600)
  const [strokeEnds, setStrokeEnds] = useState(0)
  const [result, setResult] = useState<string>("")
  const [dataUrl, setDataUrl] = useState<string>("")

  const doExport = () => {
    const r = padRef.current?.exportPng()
    if (!r) return
    setDataUrl(r.ok ? r.dataUrl : "")
    setResult(
      JSON.stringify({
        ok: r.ok,
        code: r.ok ? null : r.code,
        message: r.ok ? null : r.message,
        diagnostics: r.diagnostics,
      })
    )
  }

  return (
    <main className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">Aláírás-teszt (dev)</h1>
      <div
        data-testid="pad-container"
        style={{ width, height: 260 }}
        className="overflow-hidden rounded-lg border-2 border-dashed border-gray-300"
      >
        <SignaturePad
          ref={padRef}
          className="h-full w-full"
          onEnd={() => setStrokeEnds((n) => n + 1)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid="narrow" onClick={() => setWidth(400)}>
          Szűkít
        </button>
        <button type="button" data-testid="wide" onClick={() => setWidth(600)}>
          Bővít
        </button>
        <button type="button" data-testid="clear" onClick={() => padRef.current?.clear()}>
          Törlés
        </button>
        <button type="button" data-testid="export" onClick={doExport}>
          Export
        </button>
      </div>
      <p>
        Vonalak vége: <span data-testid="stroke-ends">{strokeEnds}</span>
      </p>
      <pre data-testid="result">{result}</pre>
      <textarea data-testid="data-url" readOnly value={dataUrl} className="hidden" />
    </main>
  )
}
