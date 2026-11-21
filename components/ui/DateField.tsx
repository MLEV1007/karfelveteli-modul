"use client"

import { useEffect, useId, useRef, useState } from "react"
import type { ClipboardEvent, FocusEvent, KeyboardEvent } from "react"

/**
 * Közös dátum / időpont mező (ÉÉÉÉ . HH . NN [ÓÓ : PP]) külön szövegmezőkkel.
 *
 * - `value` / `onChange`: ISO string — `YYYY-MM-DD` (DateField) vagy `YYYY-MM-DDTHH:mm`
 *   (DateTimeField). Hiányos vagy érvénytelen bevitelnél a kimenet üres string ("").
 * - A natív böngészős dátum-inputok böngészőfüggő hibái (5+ jegyű év, billentyűzet-
 *   kezelés tableten) miatt készült: gépeléskor automatikusan a következő mezőre ugrik.
 */

type PartKey = "y" | "m" | "d" | "h" | "mi"
type Parts = Record<PartKey, string>

const EMPTY_PARTS: Parts = { y: "", m: "", d: "", h: "", mi: "" }
const DATE_KEYS: PartKey[] = ["y", "m", "d"]
const DATETIME_KEYS: PartKey[] = ["y", "m", "d", "h", "mi"]

const MIN_YEAR = 1900
const MAX_YEAR = 2099

const PART_META: Record<
  PartKey,
  { maxLength: number; ariaLabel: string; placeholder: string; firstMax: number; width: string }
> = {
  y: { maxLength: 4, ariaLabel: "év", placeholder: "ÉÉÉÉ", firstMax: 9, width: "w-[5rem]" },
  m: { maxLength: 2, ariaLabel: "hónap", placeholder: "HH", firstMax: 1, width: "w-[3.5rem]" },
  d: { maxLength: 2, ariaLabel: "nap", placeholder: "NN", firstMax: 3, width: "w-[3.5rem]" },
  h: { maxLength: 2, ariaLabel: "óra", placeholder: "ÓÓ", firstMax: 2, width: "w-[3.5rem]" },
  mi: { maxLength: 2, ariaLabel: "perc", placeholder: "PP", firstMax: 5, width: "w-[3.5rem]" },
}

const SEPARATOR_KEYS = [".", "-", "/", ":", " "]

const pad2 = (n: number) => String(n).padStart(2, "0")

function isLeapYear(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

function daysInMonth(y: number, m: number) {
  if (m === 2) return isLeapYear(y) ? 29 : 28
  return [4, 6, 9, 11].includes(m) ? 30 : 31
}

function parseIso(value: string, withTime: boolean): Parts {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(value ?? "")
  if (!m) return { ...EMPTY_PARTS }
  return { y: m[1], m: m[2], d: m[3], h: withTime ? (m[4] ?? "") : "", mi: withTime ? (m[5] ?? "") : "" }
}

function normalizeBound(bound: string | undefined, withTime: boolean, isMax: boolean) {
  if (!bound) return undefined
  const m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(bound)
  if (!m) return undefined
  return withTime ? `${m[1]}T${m[2] ?? (isMax ? "23:59" : "00:00")}` : m[1]
}

function formatHu(iso: string) {
  const [date, time] = iso.split("T")
  const [y, m, d] = date.split("-")
  return `${y}. ${m}. ${d}.${time ? ` ${time}` : ""}`
}

function nowIso(withTime: boolean) {
  const n = new Date()
  const date = `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`
  return withTime ? `${date}T${pad2(n.getHours())}:${pad2(n.getMinutes())}` : date
}

interface EvalOptions {
  withTime: boolean
  min?: string
  max?: string
  disallowFuture?: boolean
}

interface EvalResult {
  iso: string
  state: "empty" | "partial" | "complete"
  error: string | null
}

/**
 * Hiányos vagy érvénytelen bevitel jelzése a szülő felé. Ez szándékosan NEM ISO érték,
 * ezért a meglévő Zod `dateOnlySchema` / `accidentDateSchema` regexe elutasítja, és a lépés
 * nem engedi tovább az űrlapot. Üres mező továbbra is "" (az opcionális mezők így maradhatnak üresek).
 */
export const INVALID_DATE_VALUE = "invalid"

function evaluate(p: Parts, o: EvalOptions): EvalResult {
  const keys = o.withTime ? DATETIME_KEYS : DATE_KEYS
  if (keys.every((k) => p[k] === "")) return { iso: "", state: "empty", error: null }
  const complete = p.y.length === 4 && keys.slice(1).every((k) => p[k].length === 2)
  if (!complete) return { iso: INVALID_DATE_VALUE, state: "partial", error: null }

  const fail = (error: string): EvalResult => ({ iso: INVALID_DATE_VALUE, state: "complete", error })
  const y = Number(p.y)
  const m = Number(p.m)
  const d = Number(p.d)
  if (y < MIN_YEAR || y > MAX_YEAR) return fail(`Az évszám ${MIN_YEAR} és ${MAX_YEAR} között legyen`)
  if (m < 1 || m > 12) return fail("A hónap 1 és 12 között legyen")
  const dim = daysInMonth(y, m)
  if (d < 1 || d > dim) return fail(`Ebben a hónapban legfeljebb ${dim} nap van`)
  if (o.withTime) {
    if (Number(p.h) > 23) return fail("Az óra 0 és 23 között legyen")
    if (Number(p.mi) > 59) return fail("A perc 0 és 59 között legyen")
  }

  const date = `${p.y}-${p.m}-${p.d}`
  const iso = o.withTime ? `${date}T${p.h}:${p.mi}` : date
  const label = o.withTime ? "Az időpont" : "A dátum"
  const min = normalizeBound(o.min, o.withTime, false)
  const max = normalizeBound(o.max, o.withTime, true)
  if (min && iso < min) return fail(`${label} nem lehet korábbi, mint ${formatHu(min)}`)
  if (max && iso > max) return fail(`${label} nem lehet későbbi, mint ${formatHu(max)}`)
  if (o.disallowFuture && iso > nowIso(o.withTime)) {
    return fail(`${label} nem lehet jövőbeli`)
  }
  return { iso, state: "complete", error: null }
}

function parsePasted(text: string, withTime: boolean): Partial<Parts> | null {
  const s = text.trim()
  // ÉÉÉÉ-HH-NN, ÉÉÉÉ.HH.NN., ÉÉÉÉ. HH. NN. [ÓÓ:PP], ÉÉÉÉ-HH-NNTÓÓ:PP
  let m = /^(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})\s*\.?(?:\s*[Tt\s]\s*(\d{1,2})\s*:\s*(\d{2}))?$/.exec(s)
  // ÉÉÉÉHHNN[ÓÓPP]
  if (!m) m = /^(\d{4})(\d{2})(\d{2})(?:[Tt]?(\d{2}):?(\d{2}))?$/.exec(s)
  if (!m) return null
  const out: Partial<Parts> = { y: m[1], m: pad2(Number(m[2])), d: pad2(Number(m[3])) }
  if (withTime && m[4] !== undefined) {
    out.h = pad2(Number(m[4]))
    out.mi = m[5]
  }
  return out
}

export interface DateFieldProps {
  label: string
  /** ISO string: "YYYY-MM-DD" (DateField) / "YYYY-MM-DDTHH:mm" (DateTimeField); "" ha üres */
  value: string
  /** Az új ISO string; "" ha a bevitel hiányos vagy érvénytelen */
  onChange: (value: string) => void
  error?: string
  required?: boolean
  disabled?: boolean
  /** Alap id (az év mező id-ja `${id}-y` stb.); alapból useId */
  id?: string
  /** Ha megadod, rejtett input is renderelődik az ISO értékkel (natív <form> kompatibilitás) */
  name?: string
  /** ISO határ ("YYYY-MM-DD" vagy "YYYY-MM-DDTHH:mm"); az év alapból 1900–2099 */
  min?: string
  max?: string
  /** A jövőbeli dátum/időpont elutasítása (pl. baleset időpontja, születési idő) */
  disallowFuture?: boolean
}

interface BaseProps extends DateFieldProps {
  withTime: boolean
}

function DateFieldBase({
  label,
  value,
  onChange,
  error,
  required,
  disabled,
  id,
  name,
  min,
  max,
  disallowFuture,
  withTime,
}: BaseProps) {
  const autoId = useId()
  const baseId = id ?? `df-${autoId.replace(/:/g, "")}`
  const labelId = `${baseId}-label`
  const errorId = `${baseId}-error`
  const keys = withTime ? DATETIME_KEYS : DATE_KEYS

  const [parts, setPartsState] = useState<Parts>(() => parseIso(value, withTime))
  const [touched, setTouched] = useState(false)
  const partsRef = useRef(parts)
  const valueRef = useRef(value)
  valueRef.current = value
  const inputRefs = useRef<Partial<Record<PartKey, HTMLInputElement | null>>>({})

  const evalOpts: EvalOptions = { withTime, min, max, disallowFuture }
  const evalOptsRef = useRef(evalOpts)
  evalOptsRef.current = evalOpts

  // Külső (szülő által kezdeményezett) értékváltozás szinkronizálása. A saját
  // onChange-ünk által okozott változásnál a mezők már egyeznek, itt nem történik semmi.
  useEffect(() => {
    if (value !== evaluate(partsRef.current, evalOptsRef.current).iso) {
      const next = parseIso(value, withTime)
      partsRef.current = next
      setPartsState(next)
      // Mentett piszkozatból érkező "invalid" jelző üres mezőnél: tisztítsuk ki.
      if (value === INVALID_DATE_VALUE) onChange("")
    }
  }, [value, withTime])

  const commit = (next: Parts) => {
    partsRef.current = next
    setPartsState(next)
    const { iso } = evaluate(next, evalOpts)
    if (iso !== valueRef.current) onChange(iso)
  }

  const focusPart = (key: PartKey | undefined, caretAtEnd = false) => {
    if (!key) return
    const el = inputRefs.current[key]
    if (!el) return
    el.focus()
    if (caretAtEnd) {
      const len = el.value.length
      el.setSelectionRange(len, len)
    }
  }

  const neighbour = (key: PartKey, dir: -1 | 1) => keys[keys.indexOf(key) + dir]

  const handleChange = (key: PartKey, raw: string) => {
    const meta = PART_META[key]
    let v = raw.replace(/\D/g, "").slice(0, meta.maxLength)
    const prev = partsRef.current[key]
    const grew = v.length > prev.length
    let jump = false
    if (grew) {
      if (key === "y") {
        jump = v.length === 4
      } else if (v.length === 1 && Number(v) > meta.firstMax) {
        v = `0${v}`
        jump = true
      } else if (v.length === 2) {
        jump = true
      }
    }
    commit({ ...partsRef.current, [key]: v })
    if (jump) focusPart(neighbour(key, 1))
  }

  const handleKeyDown = (key: PartKey) => (e: KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    const prevKey = neighbour(key, -1)
    const nextKey = neighbour(key, 1)
    if (e.key === "Backspace" && el.value === "" && prevKey) {
      e.preventDefault()
      focusPart(prevKey, true)
    } else if (e.key === "ArrowLeft" && el.selectionStart === 0 && el.selectionEnd === 0 && prevKey) {
      e.preventDefault()
      focusPart(prevKey, true)
    } else if (
      e.key === "ArrowRight" &&
      el.selectionStart === el.value.length &&
      el.selectionEnd === el.value.length &&
      nextKey
    ) {
      e.preventDefault()
      focusPart(nextKey)
    } else if (SEPARATOR_KEYS.includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Elválasztó (pont, kötőjel, perjel, kettőspont, szóköz): ugrás a következő mezőre
      e.preventDefault()
      if (el.value !== "" && nextKey) focusPart(nextKey)
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const parsed = parsePasted(e.clipboardData.getData("text"), withTime)
    if (!parsed) return // sima számjegyek: az alap működés (szűrés + maxLength) kezeli
    e.preventDefault()
    const next = { ...partsRef.current, ...parsed }
    if (!withTime) {
      next.h = ""
      next.mi = ""
    }
    commit(next)
    focusPart(parsed.mi !== undefined ? "mi" : "d", true)
  }

  const handleBlur = (key: PartKey) => (e: FocusEvent<HTMLInputElement>) => {
    const cur = partsRef.current[key]
    if (key !== "y" && cur.length === 1) commit({ ...partsRef.current, [key]: `0${cur}` })
    const group = e.currentTarget.closest('[role="group"]')
    if (!group || !group.contains(e.relatedTarget as Node | null)) setTouched(true)
  }

  const result = evaluate(parts, evalOpts)
  let internalError = result.error
  if (!internalError && result.state === "partial" && touched) {
    internalError = withTime ? "Hiányos időpont" : "Hiányos dátum"
  }
  const shownError = internalError ?? error

  const inputClass = (key: PartKey) =>
    `min-h-[48px] ${PART_META[key].width} rounded-lg border px-2 py-2 text-center text-sm bg-white dark:bg-gray-800 dark:text-gray-100 outline-none transition-colors focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
      shownError ? "border-red-500 focus:ring-red-400" : "border-gray-300 dark:border-gray-600"
    }`

  const sep = (text: string) => (
    <span aria-hidden="true" className="text-gray-500 dark:text-gray-400 select-none">
      {text}
    </span>
  )

  return (
    <div className="flex flex-col gap-1">
      <label
        id={labelId}
        htmlFor={`${baseId}-y`}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={shownError ? errorId : undefined}
        className="flex flex-wrap items-center gap-2"
      >
        {keys.map((key, i) => {
          const meta = PART_META[key]
          return (
            <span key={key} className="contents">
              {i > 0 && key === "h" && <span className="w-1" aria-hidden="true" />}
              {i > 0 && key !== "h" && sep(key === "mi" ? ":" : ".")}
              <input
                ref={(el) => {
                  inputRefs.current[key] = el
                }}
                id={`${baseId}-${key}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="next"
                autoComplete="off"
                maxLength={meta.maxLength}
                placeholder={meta.placeholder}
                aria-label={meta.ariaLabel}
                aria-required={required || undefined}
                aria-invalid={shownError ? true : undefined}
                disabled={disabled}
                value={parts[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                onKeyDown={handleKeyDown(key)}
                onPaste={handlePaste}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={handleBlur(key)}
                className={inputClass(key)}
              />
              {!withTime && key === "d" && sep(".")}
            </span>
          )
        })}
      </div>
      {name && <input type="hidden" name={name} value={value} />}
      {shownError && (
        <p id={errorId} className="text-xs text-red-500">
          {shownError}
        </p>
      )}
    </div>
  )
}

export function DateField(props: DateFieldProps) {
  return <DateFieldBase {...props} withTime={false} />
}

export function DateTimeField(props: DateFieldProps) {
  return <DateFieldBase {...props} withTime />
}

export default DateField
