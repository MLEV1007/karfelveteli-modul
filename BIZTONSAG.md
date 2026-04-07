# Biztonsági fejlesztési terv — M1 Szerviz Kárfelvételi Modul

Utoljára frissítve: 2026-04-01 15:30

---

## Státusz jelölések
- [ ] Tervezett
- [~] Folyamatban
- [x] Kész

---

## 1. Fájlméret-limit szerver oldalon
**Prioritás:** Magas  
**Státusz:** [ ]

**Probléma:** Csak a formon van darabszám-limit (5 kép), de ez egy közvetlen POST kéréssel megkerülhető. Nincs szerver oldali méretkorlát.

**Teendők:**
- [ ] Max fájlméret ellenőrzés API oldalon (pl. 10MB/kép)
- [ ] Teljes request body méretének korlátozása
- [ ] File magic bytes ellenőrzés (valóban kép-e a feltöltött fájl)

---

## 2. Rate limiting fallback
**Prioritás:** Közepes  
**Státusz:** [ ]

**Probléma:** Ha a Redis nem elérhető, a rate limiting automatikusan kikapcsol. Redis-nélküli vagy hibás környezetben az endpoint teljesen védtelen tömeges beküldéssel szemben.

**Teendők:**
- [ ] In-memory fallback rate limiter implementálása (Map + timestamp alapú)
- [ ] Redis kiesés esetén is aktív maradjon az alapszintű védelem

---

## 3. Presigned URL feltöltés (nagy request body)
**Prioritás:** Magas  
**Státusz:** [x] Kész — 2026-04-01

**Probléma:** A fotók base64 kódolva kerültek a JSON bodyba. 5 db nagy kép esetén a request elérte a ~65MB-ot, ami memória- és DoS problémát okozhatott.

**Megvalósítás:**
- [x] `@aws-sdk/s3-request-presigner` csomag telepítve
- [x] `lib/r2.ts` — `getPresignedUploadUrl()` függvény, 15 perces lejárattal, MIME type whitelist-tel
- [x] `app/api/upload-url/route.ts` — új POST endpoint, presigned URL-eket ad vissza
- [x] `Step4DamageAndPhotos.tsx` — kliens közvetlenül PUT kéréssel tölti fel a fájlt R2-re
- [x] `app/api/submit/route.ts` — fotó base64 feldolgozás eltávolítva, a submit csak az R2 URL-eket fogadja

---

## 3.5. Magic Link alapú szerkesztés (szerviz számára)
**Prioritás:** Közepes  
**Státusz:** [x] Kész — 2026-04-03

**Funkció:** A szerviz a beküldés után kapott emailben egyedi, időkorlátozott linken keresztül szerkesztheti a kárfelvételt.

**Megvalósítás:**
- [x] DB: `editToken` (UUID, unique) + `tokenExpiresAt` (7 nap fix lejárat)
- [x] Token generálás: `crypto.randomUUID()` a submit során
- [x] Email: Csak a szerviz emailjében jelenik meg a szerkesztési link
- [x] Edit route: `/edit/[id]?token=...` — token validáció szerver oldalon
- [x] EditForm: Single-page kliens komponens, csoportosított szekciókkal
- [x] PATCH API: `/api/edit` — IP-based rate limiting (10/óra), strict Zod validáció
- [x] Readonly mezők: `photoUrls`, `ownerSignatureUrl`, `driverSignatureUrl`, `gdprConsent`, `createdAt`, `emailSentAt`

**Biztonsági védelmek:**
- ✅ Token kriptográfiailag biztonságos (UUID v4)
- ✅ Szerver oldali lejárat ellenőrzés (`new Date() < tokenExpiresAt`)
- ✅ IP-based rate limiting (NEM token-based, így lejárt tokennel se lehet spammelni)
- ✅ Zod `.strict()` mode — csak engedélyezett mezők, extra mezők automatikusan eldobva
- ✅ Egységes 401 hibaválasz (ne árulja el, hogy létezik-e vagy lejárt-e a token)
- ✅ Link CSAK a szerviz emailjébe kerül, az ügyfél emailjébe NEM

**Határok (v1):**
- Token újraküldés NEM implementált (v2 admin funkcióhoz kell)
- Audit log NEM implementált (ki, mikor, mit szerkesztett)
- Szerkesztési history NEM tárolva

---

## 4. GDPR automatikus adattörlés
**Prioritás:** Közepes  
**Státusz:** [ ]

**Probléma:** Nincs automatikus törlési mechanizmus. Az adatbázisban és az R2-n korlátlan ideig megmaradnak a személyes adatok, aláírások, fotók.

**Teendők:**
- [ ] Megőrzési határidő meghatározása (pl. 2 év)
- [ ] Automatikus törlési / anonimizálási job (Supabase cron vagy Vercel Cron)
- [ ] R2 fájlok törlése a DB rekord törlésével együtt
- [ ] Törlési napló vezetése

---

## 5. Security headerek
**Prioritás:** Közepes  
**Státusz:** [ ]

**Probléma:** Nincs `middleware.ts`, nincs egységes security header konfiguráció.

**Teendők:**
- [ ] `middleware.ts` létrehozása
- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] Alap Content Security Policy (CSP) beállítása
- [ ] `next.config.mjs` `headers()` konfiguráció

---

## 6. Strukturált logging (személyes adatok védelme)
**Prioritás:** Alacsony  
**Státusz:** [ ]

**Probléma:** Hiba esetén a `console.error` logok potenciálisan személyes adatokat tartalmazhatnak a Prisma hibaüzenetekben.

**Teendők:**
- [ ] Strukturált logger bevezetése (pl. `pino`)
- [ ] Személyes adatokat tartalmazó mezők szűrése a logokból
- [ ] Csak hibaüzenet + stack trace naplózása

---

## 7. Logo route path biztonság
**Prioritás:** Alacsony  
**Státusz:** [ ]

**Probléma:** Az `/api/logo` route `fs.readFileSync`-kel olvas. Jelenleg biztonságos (hard-coded path), de figyelni kell, hogy soha ne váljon dinamikussá.

**Teendők:**
- [ ] Dokumentálni a szabályt: a path soha ne kerüljön query param vagy felhasználói bemenet alapján vezérlésre
- [ ] Kód review checklist pontként rögzíteni

---

## Összesítés

| # | Téma | Prioritás | Státusz |
|---|------|-----------|---------|
| 1 | Fájlméret-limit szerver oldalon | Magas | [ ] |
| 3 | Presigned URL feltöltés | Magas | [x] |
| 2 | Rate limiting fallback | Közepes | [ ] |
| 4 | GDPR automatikus törlés | Közepes | [ ] |
| 5 | Security headerek | Közepes | [ ] |
| 6 | Strukturált logging | Alacsony | [ ] |
| 7 | Logo route path | Alacsony | [ ] |
