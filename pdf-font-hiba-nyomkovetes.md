# PDF betűtípus hiba – Nyomkövetési napló

## A hiba leírása
A form kitöltése után a PDF generálás hibára fut. A hiba a Roboto betűtípus hozzáadása óta jelentkezik.

**Érintett fájl:** `lib/pdf.tsx`  
**Hiba keletkezési helye:** `app/api/submit/route.ts` → `generatePDF()` hívás (5. lépés)

## A jelenlegi font regisztráció (`lib/pdf.tsx`, 16–28. sor)
```typescript
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf"),
      fontWeight: "normal",
    },
    {
      src: path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf"),
      fontWeight: "bold",
    },
  ],
})
```

---

## Megpróbált megoldások

### 🔄 1. kísérlet — fs.readFileSync + base64 data URL (2026-03-31)
- **Mit változtattunk:** `lib/pdf.tsx` — a `path.join(process.cwd(), ...)` fájlútvonal helyett a font fájlokat `fs.readFileSync`-kel beolvassuk és `data:font/truetype;base64,...` formátumban adjuk át a `Font.register()`-nek
- **Miért remélhető, hogy működik:** A `@react-pdf/renderer` belső font loadere nem kell fájlútvonalat feloldjon — a nyers font adat azonnal elérhető. Fájl nem található hiba esetén az import pillanatában jelenik meg, nem a PDF rendereléskor.
- **Eredmény:** (kitöltendő tesztelés után — működik ✅ / nem működött ❌)
- **Ha nem működött:** Következő lépés → Font regisztráció áthelyezése a `generatePDF()` függvénybe (terv 4. lépés)

---

## Tervezett megoldási lépések (sorrendben)

Lásd: `pdf-font-hiba-terv.md`
