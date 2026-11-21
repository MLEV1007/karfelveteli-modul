import type { Locator, Page } from "@playwright/test"

export type PointerKind = "touch" | "pen"
export type PointerEventName = "pointerdown" | "pointermove" | "pointerup" | "pointercancel" | "pointerleave"

export interface PointerOpts {
  pointerId?: number
  pointerType?: PointerKind
  pressure?: number
}

// Szintetikus PointerEvent küldése a vászonra. Az x/y a vászon méretéhez viszonyított arány
// (0..1), így minden eszközméreten ugyanazt a rajzot kapjuk. Szándékosan nem page.mouse-t
// használunk: a mobil WebKit projekteken az egér-emuláció eltér, a pointer események viszont
// azonosan működnek, és így a 2. pointer / toll is szimulálható.
export async function firePointer(
  canvas: Locator,
  type: PointerEventName,
  fx: number,
  fy: number,
  opts: PointerOpts = {}
) {
  await canvas.evaluate(
    (el, a) => {
      const r = el.getBoundingClientRect()
      el.dispatchEvent(
        new PointerEvent(a.type, {
          bubbles: true,
          cancelable: true,
          pointerId: a.pointerId,
          pointerType: a.pointerType,
          isPrimary: true,
          clientX: r.left + a.fx * r.width,
          clientY: r.top + a.fy * r.height,
          pressure: a.pressure,
          button: 0,
          buttons: a.type === "pointerup" || a.type === "pointercancel" ? 0 : 1,
        })
      )
    },
    { type, fx, fy, pointerId: opts.pointerId ?? 1, pointerType: opts.pointerType ?? "touch", pressure: opts.pressure ?? 0.5 }
  )
}

// Egy teljes vonal: down + (n-1) move + up. Visszaadja a küldött pontok számát (down + move).
export async function drawStroke(
  canvas: Locator,
  points: Array<[number, number]>,
  opts: PointerOpts = {},
  { up = true }: { up?: boolean } = {}
): Promise<number> {
  const [first, ...rest] = points
  await firePointer(canvas, "pointerdown", first[0], first[1], opts)
  for (const [x, y] of rest) await firePointer(canvas, "pointermove", x, y, opts)
  if (up) {
    const last = points[points.length - 1]
    await firePointer(canvas, "pointerup", last[0], last[1], opts)
  }
  return points.length
}

// Hullámos "aláírás" n ponttal
export function wavePoints(n: number, x0 = 0.1, x1 = 0.9, yBase = 0.5, amp = 0.25): Array<[number, number]> {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    return [x0 + (x1 - x0) * t, yBase + amp * Math.sin(t * Math.PI * 6) * (1 - 0.4 * t)] as [number, number]
  })
}

// Megvárja, hogy a ResizeObserver és a következő képkockák lefussanak
export async function settleLayout(page: Page) {
  await page.evaluate(
    () => new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(res, 100))))
  )
}
