"use client"

import { useCallback, useRef, useState } from "react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"
import Checkbox from "@/components/ui/Checkbox"
import SignatureModal from "@/components/ui/SignatureModal"
import ConfirmDialog from "./ConfirmDialog"

export interface WitnessItem {
  id: string
  name: string
  address: string
  sortOrder: number
  isActive: boolean
  referenced: boolean
  signatureUrl: string | null
}

interface WitnessListData {
  witnesses: WitnessItem[]
  activeCount: number
  warning: string | null
}

interface SignatureValue {
  mode: "draw" | "upload"
  dataUrl: string
  file: File | null
}

const EMPTY_SIGNATURE: SignatureValue = { mode: "draw", dataUrl: "", file: null }
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024

const smallBtn =
  "inline-flex items-center justify-center min-h-[44px] px-3 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"

// Aláírás megadása: rajzolva (SignaturePad a modalban) VAGY feltöltött PNG/JPG
function SignatureInput({
  value,
  onChange,
  disabled,
  idPrefix,
}: {
  value: SignatureValue
  onChange: (v: SignatureValue) => void
  disabled?: boolean
  idPrefix: string
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [fileError, setFileError] = useState("")

  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aláírás</legend>
      <div className="flex gap-4">
        {(["draw", "upload"] as const).map((m) => (
          <label key={m} className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="radio"
              name={`${idPrefix}-sigmode`}
              checked={value.mode === m}
              onChange={() => onChange({ ...EMPTY_SIGNATURE, mode: m })}
              className="h-4 w-4"
            />
            {m === "draw" ? "Rajzolás" : "Kép feltöltése (PNG/JPG)"}
          </label>
        ))}
      </div>

      {value.mode === "draw" ? (
        <div>
          {value.dataUrl && (
            <div className="rounded-lg border bg-white mb-2 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value.dataUrl} alt="Rajzolt aláírás" className="h-[100px] w-full object-contain" />
            </div>
          )}
          <button type="button" className={smallBtn} onClick={() => setModalOpen(true)}>
            {value.dataUrl ? "Aláírás újrarajzolása" : "Aláírás rajzolása"}
          </button>
          <SignatureModal
            open={modalOpen}
            title="Tanú aláírása"
            onCancel={() => setModalOpen(false)}
            onConfirm={(dataUrl) => {
              setModalOpen(false)
              onChange({ mode: "draw", dataUrl, file: null })
            }}
          />
        </div>
      ) : (
        <div>
          <input
            id={`${idPrefix}-file`}
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              setFileError("")
              if (file && file.size > MAX_UPLOAD_BYTES) {
                setFileError("A kép túl nagy (legfeljebb 2 MB lehet).")
                e.target.value = ""
                onChange({ mode: "upload", dataUrl: "", file: null })
                return
              }
              if (file && file.type !== "image/png" && file.type !== "image/jpeg") {
                setFileError("Csak PNG vagy JPG kép tölthető fel.")
                e.target.value = ""
                onChange({ mode: "upload", dataUrl: "", file: null })
                return
              }
              onChange({ mode: "upload", dataUrl: "", file })
            }}
            className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:min-h-[44px] file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-4 file:text-sm dark:file:bg-gray-800 dark:file:border-gray-600"
          />
          {fileError && <p className="text-xs text-red-500 mt-1">{fileError}</p>}
        </div>
      )}
    </fieldset>
  )
}

function hasSignature(v: SignatureValue): boolean {
  return v.mode === "draw" ? !!v.dataUrl : !!v.file
}

function appendSignature(form: FormData, v: SignatureValue) {
  if (v.mode === "draw" && v.dataUrl) form.set("signatureDataUrl", v.dataUrl)
  if (v.mode === "upload" && v.file) form.set("signatureFile", v.file)
}

export default function WitnessManager({ initial }: { initial: WitnessListData }) {
  const [data, setData] = useState<WitnessListData>(initial)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState("")
  const [addAddress, setAddAddress] = useState("")
  const [addActive, setAddActive] = useState(initial.activeCount < 2)
  const [addSig, setAddSig] = useState<SignatureValue>(EMPTY_SIGNATURE)

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editAddress, setEditAddress] = useState("")
  const [editSig, setEditSig] = useState<SignatureValue>(EMPTY_SIGNATURE)

  const [confirm, setConfirm] = useState<{ kind: "deactivate" | "delete"; witness: WitnessItem } | null>(null)

  const reload = useCallback(async () => {
    const res = await fetch("/api/admin/tanuk", { cache: "no-store" })
    if (res.ok) setData((await res.json()) as WitnessListData)
  }, [])

  // Egységes mutáció-futtató: egyszerre csak egy fut (ref + disabled gombok), siker után a lista újratöltődik
  async function mutate(doRequest: () => Promise<Response>, okText: string): Promise<boolean> {
    if (inFlight.current) return false
    inFlight.current = true
    setBusy(true)
    setMessage(null)
    let success = false
    try {
      const res = await doRequest()
      const body = await res.json().catch(() => ({}))
      if (res.status === 401) {
        setMessage({ kind: "error", text: "A munkamenet lejárt. Jelentkezz be újra." })
      } else if (!res.ok) {
        setMessage({ kind: "error", text: body.error || "A művelet nem sikerült." })
      } else {
        success = true
        setMessage({ kind: "ok", text: [okText, body.warning].filter(Boolean).join(" ") })
        await reload()
      }
    } catch {
      setMessage({ kind: "error", text: "Hálózati hiba. Frissítsd az oldalt, és ellenőrizd az állapotot." })
    } finally {
      inFlight.current = false
      setBusy(false)
    }
    return success
  }

  const jsonAction = (id: string, action: string) =>
    fetch(`/api/admin/tanuk/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addName.trim() || !addAddress.trim()) {
      setMessage({ kind: "error", text: "Add meg a tanú nevét és lakcímét." })
      return
    }
    if (!hasSignature(addSig)) {
      setMessage({ kind: "error", text: "Adj meg aláírást: rajzold meg, vagy tölts fel képet." })
      return
    }
    const form = new FormData()
    form.set("name", addName)
    form.set("address", addAddress)
    form.set("isActive", String(addActive))
    appendSignature(form, addSig)
    const ok = await mutate(() => fetch("/api/admin/tanuk", { method: "POST", body: form }), "A tanú felvéve.")
    if (ok) {
      setShowAdd(false)
      setAddName("")
      setAddAddress("")
      setAddSig(EMPTY_SIGNATURE)
    }
  }

  function startEdit(w: WitnessItem) {
    setEditId(w.id)
    setEditName(w.name)
    setEditAddress(w.address)
    setEditSig(EMPTY_SIGNATURE)
    setMessage(null)
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    const form = new FormData()
    form.set("name", editName)
    form.set("address", editAddress)
    appendSignature(form, editSig)
    const ok = await mutate(
      () => fetch(`/api/admin/tanuk/${editId}`, { method: "PATCH", body: form }),
      "A tanú adatai mentve."
    )
    if (ok) setEditId(null)
  }

  const sorted = [...data.witnesses]
  const activeCount = data.activeCount
  const warningTone =
    activeCount === 2 ? null : "bg-red-50 border-red-300 text-red-900 dark:bg-red-900/20 dark:border-red-700 dark:text-red-100"

  return (
    <div>
      {data.warning && (
        <div role="alert" className={`mb-4 p-4 rounded-lg border-2 text-sm font-medium ${warningTone}`}>
          {data.warning}
        </div>
      )}
      {activeCount === 2 && (
        <p className="mb-4 text-sm text-green-700 dark:text-green-300">Rendben: pontosan 2 aktív tanú van.</p>
      )}

      {message && (
        <div
          role={message.kind === "error" ? "alert" : "status"}
          className={`mb-4 p-3 rounded-lg border text-sm ${
            message.kind === "error"
              ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
              : "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-4">
        {!showAdd && (
          <Button onClick={() => { setShowAdd(true); setAddActive(activeCount < 2); setMessage(null) }} disabled={busy}>
            Új tanú felvétele
          </Button>
        )}
      </div>

      {showAdd && (
        <Card className="mb-6">
          <form onSubmit={submitAdd} className="space-y-4" aria-label="Új tanú">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Új tanú</h2>
            <Input label="Név" name="witness-add-name" value={addName} onChange={(e) => setAddName(e.target.value)} required maxLength={120} disabled={busy} />
            <Input label="Lakcím" name="witness-add-address" value={addAddress} onChange={(e) => setAddAddress(e.target.value)} required maxLength={250} disabled={busy} />
            <SignatureInput value={addSig} onChange={setAddSig} disabled={busy} idPrefix="add" />
            <div>
              <Checkbox
                label="Aktív"
                name="witness-add-active"
                checked={addActive}
                onChange={(e) => setAddActive(e.target.checked)}
              />
              {addActive && activeCount >= 2 && (
                <p className="text-xs text-red-500">Már 2 aktív tanú van — előbb inaktiválj egyet, vagy vedd fel inaktívként.</p>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <Button variant="secondary" onClick={() => setShowAdd(false)} disabled={busy}>Mégse</Button>
              <Button type="submit" loading={busy}>Tanú mentése</Button>
            </div>
          </form>
        </Card>
      )}

      {sorted.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-600 dark:text-gray-400">Még nincs tanú felvéve.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {sorted.map((w, index) => (
            <li key={w.id}>
              <Card>
                {editId === w.id ? (
                  <form onSubmit={submitEdit} className="space-y-4" aria-label="Tanú szerkesztése">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tanú szerkesztése</h2>
                    <Input label="Név" name="witness-edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} required maxLength={120} disabled={busy} />
                    <Input label="Lakcím" name="witness-edit-address" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} required maxLength={250} disabled={busy} />
                    {w.referenced ? (
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Az aláírás nem cserélhető, mert a tanú már szerepel kiadott meghatalmazásban (az újragenerált dokumentumokat visszamenőleg megváltoztatná). Új aláíráshoz vegyél fel új tanút.
                      </p>
                    ) : (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Az aláírást csak akkor kell megadni, ha cserélni szeretnéd.</p>
                        <SignatureInput value={editSig} onChange={setEditSig} disabled={busy} idPrefix="edit" />
                      </div>
                    )}
                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                      <Button variant="secondary" onClick={() => setEditId(null)} disabled={busy}>Mégse</Button>
                      <Button type="submit" loading={busy}>Mentés</Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="sm:w-48 shrink-0">
                      {w.signatureUrl ? (
                        <div className="rounded-lg border bg-white overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={w.signatureUrl} alt={`${w.name} aláírása`} loading="lazy" referrerPolicy="no-referrer" className="h-[80px] w-full object-contain" />
                        </div>
                      ) : (
                        <p className="text-xs text-red-600 dark:text-red-400">Az aláírás-kép nem érhető el. Töltsd fel újra.</p>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{w.name}</h2>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            w.isActive
                              ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800"
                              : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                          }`}
                        >
                          {w.isActive ? "Aktív" : "Inaktív"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Sorrend: {index + 1}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{w.address}</p>
                      {w.referenced && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Kiadott dokumentumban szerepel — nem törölhető, csak inaktiválható.</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button type="button" className={smallBtn} disabled={busy || index === 0} aria-label={`${w.name} feljebb`} onClick={() => mutate(() => jsonAction(w.id, "moveUp"), "Sorrend módosítva.")}>↑ Feljebb</button>
                        <button type="button" className={smallBtn} disabled={busy || index === sorted.length - 1} aria-label={`${w.name} lejjebb`} onClick={() => mutate(() => jsonAction(w.id, "moveDown"), "Sorrend módosítva.")}>↓ Lejjebb</button>
                        <button type="button" className={smallBtn} disabled={busy} onClick={() => startEdit(w)}>Szerkesztés</button>
                        {w.isActive ? (
                          <button type="button" className={smallBtn} disabled={busy} onClick={() => setConfirm({ kind: "deactivate", witness: w })}>Inaktiválás</button>
                        ) : (
                          <button
                            type="button"
                            className={smallBtn}
                            disabled={busy}
                            onClick={() => mutate(() => jsonAction(w.id, "activate"), "A tanú aktiválva.")}
                          >
                            Aktiválás
                          </button>
                        )}
                        <button
                          type="button"
                          className={`${smallBtn} !text-red-700 !border-red-300 dark:!text-red-300`}
                          disabled={busy || w.referenced}
                          title={w.referenced ? "Kiadott dokumentumban szerepel — csak inaktiválható" : undefined}
                          onClick={() => setConfirm({ kind: "delete", witness: w })}
                        >
                          Törlés
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirm?.kind === "deactivate"}
        title="Tanú inaktiválása"
        confirmLabel="Inaktiválás"
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const w = confirm?.witness
          if (!w) return
          await mutate(() => jsonAction(w.id, "deactivate"), "A tanú inaktiválva.")
          setConfirm(null)
        }}
      >
        <p>{confirm?.witness.name} inaktiválása után {Math.max(0, activeCount - 1)} aktív tanú marad.</p>
        <p className="font-medium">A meghatalmazások PONTOSAN 2 aktív tanúval készülnek: amíg nincs 2 aktív tanú, az új lezárások és újragenerálások hibával leállnak.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm?.kind === "delete"}
        title="Tanú törlése"
        confirmLabel="Törlés"
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const w = confirm?.witness
          if (!w) return
          await mutate(() => fetch(`/api/admin/tanuk/${w.id}`, { method: "DELETE" }), "A tanú törölve.")
          setConfirm(null)
        }}
      >
        <p>{confirm?.witness.name} véglegesen törlődik, az aláírás-képével együtt. Ez nem vonható vissza.</p>
        {confirm?.witness.isActive && <p className="font-medium">A tanú jelenleg aktív: törlés után {Math.max(0, activeCount - 1)} aktív tanú marad.</p>}
      </ConfirmDialog>
    </div>
  )
}
