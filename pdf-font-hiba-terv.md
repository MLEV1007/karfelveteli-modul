# PDF betűtípus hiba – Javítási terv

## Háttér

A `lib/pdf.tsx` modul szintjén hívja meg a `Font.register()`-t, és a betűtípus fájlok elérési útját `path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf")` formában adja meg.

A Next.js App Router szerver oldali környezetben (Node.js runtime) ez több okból is meghiúsulhat.

---

## Lehetséges okok (valószínűség szerint sorrendben)

### 1. `process.cwd()` nem a projekt gyökerét adja vissza
Next.js build/futás során – különösen Vercel-en – a `process.cwd()` nem feltétlenül a `/public/fonts/` mappára mutat. A Next.js a szerveroldali kódot a `.next/server/` alá compileálja, ahol a `public/` mappa nem elérhető a `process.cwd()` relatív úton.

### 2. Font regisztráció modul szinten fut (nem a hívás pillanatában)
A `Font.register()` a modul betöltésekor fut le, nem a `generatePDF()` hívásakor. Ha a Next.js bundler nem tartalmazza a font fájlokat, vagy a fájlrendszer elérése eltérő, a regisztráció csendben meghiúsul, majd a PDF renderelés dob hibát.

### 3. `@react-pdf/renderer` belső hibakezelés
A 3.x verzióban a font betöltés aszinkron, de a `Font.register()` szinkron módon van meghívva. Ha a font fájl nem tölthető be (rossz útvonal), a renderer a PDF generálásakor dob kivételt.

### 4. Next.js edge runtime / modul bundling konfliktus
Ha a route valaha edge-re kerülne, a `path` és `fs` modulok nem elérhetők. Jelenleg nem ez a helyzet (nincs `export const runtime = 'edge'`), de érdemes kizárni.

---

## Javítási lépések (prioritás sorrendben)

### Lépés 1 – Pontos hibaüzenet kinyerése (diagnosztika)
**Elvégzendő:** A `app/api/submit/route.ts` 186. során már van `console.error("PDF hiba részletei:", pdfError)` – nézzük meg a szerver logot (terminálban vagy Vercel logban).

- Ha a hiba: `"Could not load font"` → font fájl elérési út probléma (→ Lépés 2)
- Ha a hiba: `"Cannot read properties of undefined"` → react-pdf komponens hiba (→ Lépés 4)
- Ha a hiba: `"ENOENT: no such file or directory"` → path probléma (→ Lépés 2)

---

### Lépés 2 – Font elérési út javítása (`path.resolve` + `__dirname` vagy `URL`)

**Módosítandó:** `lib/pdf.tsx`, 19–25. sor

A `process.cwd()` helyett `path.resolve()` kombinációt vagy `URL`-alapú útvonalat kell használni.

**A jelenlegi kód:**
```typescript
src: path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf"),
```

**Javasolt csere – opció A (`path.resolve` + `__dirname`-szerű megközelítés):**
```typescript
import { fileURLToPath } from "url"
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// majd:
src: path.resolve(__dirname, "../../public/fonts/Roboto-Regular.ttf"),
```

**Javasolt csere – opció B (`process.cwd()` megtartása, de ellenőrzéssel):**
```typescript
const fontsDir = path.resolve(process.cwd(), "public", "fonts")
src: path.join(fontsDir, "Roboto-Regular.ttf"),
```
(Előtte adjunk `console.log(fontsDir)` sort, hogy lássuk mi az aktuális út.)

---

### Lépés 3 – Font betöltése Buffer-ként (legmegbízhatóbb módszer)

Ha az útvonal alapú megközelítés nem működik, a font fájlt `fs.readFileSync`-kel töltjük be és base64 adatURL-ként adjuk át a `Font.register`-nek.

```typescript
import fs from "fs"

const robotoRegularBuffer = fs.readFileSync(
  path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf")
)
const robotoBoldBuffer = fs.readFileSync(
  path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf")
)

Font.register({
  family: "Roboto",
  fonts: [
    {
      src: `data:font/truetype;base64,${robotoRegularBuffer.toString("base64")}`,
      fontWeight: "normal",
    },
    {
      src: `data:font/truetype;base64,${robotoBoldBuffer.toString("base64")}`,
      fontWeight: "bold",
    },
  ],
})
```

---

### Lépés 4 – Font regisztráció áthelyezése a `generatePDF()` függvénybe

Ha a modul szintű `Font.register()` okozza a problémát (pl. Next.js modul cache miatt duplán fut, vagy a fájlrendszer még nem elérhető a modul betöltésekor):

```typescript
let fontRegistered = false

export async function generatePDF(data: PDFData): Promise<Buffer> {
  if (!fontRegistered) {
    Font.register({ ... })
    fontRegistered = true
  }
  // ... többi kód
}
```

---

### Lépés 5 – CDN-alapú font forrás (Vercel-specifikus fallback)

Ha a fájlrendszer elérés teljesen megbízhatatlan a deployment környezetben, Google Fonts CDN-ről töltsük be a fontot:

```typescript
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/roboto/v32/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2",
      fontWeight: "normal",
    },
    {
      src: "https://fonts.gstatic.com/s/roboto/v32/KFOlCnqEu92Fr1MmWUlfBBc4AMP6lQ.woff2",
      fontWeight: "bold",
    },
  ],
})
```

**Hátrány:** Hálózati hívástól függ, lassabb. Csak végső megoldásként.

---

### Lépés 6 – Visszaállás Helvetica-ra (ideiglenes, ha semmi sem működik)

Ha minden más megoldás meghiúsul és sürgős a deployed verzió, ideiglenesen visszaállhatunk a beépített `Helvetica` fontra (nem támogatja a magyar ékezetes karaktereket, de legalább a PDF generálás nem hibázik):

```typescript
// Font.register() sor törlése
// styles-ban:
page: {
  fontFamily: "Helvetica",
  ...
}
```

---

## Ellenőrzési lépések javítás után

1. Lokálisan: `npm run dev` → form kitöltés → PDF hiba eltűnik-e?
2. Szerver log: nincs `"PDF hiba részletei"` sor?
3. PDF-ben: Magyar ékezetes karakterek (á, é, ő, ű stb.) helyesen jelennek meg?
4. Deployment: Vercel/production logban nincs font-betöltési hiba?

---

## Nyomkövetés
Minden megpróbált lépést dokumentálj a `pdf-font-hiba-nyomkovetes.md` fájlban.
