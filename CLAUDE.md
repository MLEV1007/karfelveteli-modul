# Digitális Kárfelvételi Platform — BuildMySite

## Stack
Next.js 14 App Router | Tailwind CSS v4 | Prisma | PostgreSQL (Supabase) | Resend | @react-pdf/renderer | Zod | react-signature-canvas

## Kritikus szabályok
- MINDIG use context7 a Next.js, Prisma, Resend dokumentációhoz
- Soha ne használj express-rate-limit — helyette @upstash/ratelimit
- Az aláírás Supabase Storage-ba kerül PNG-ként, DB-ben csak URL tárolódik
- Szerver oldali kód: /lib/ mappában, soha ne kerüljön /components/ alá
- Minden API validáció Zod-dal történik, szerver oldalon
- Környezeti változók: .env.local (soha nem kerül Git-be)

## Adatbázis
Egyetlen tábla: DamageReport (lásd Prisma schema)
Supabase Storage bucket neve: signatures

## Email logika
- Két email megy ki minden beküldésnél: ügyfélnek + műhelynek
- PDF mellékletként csatolva mindkettőhöz
- Resend from cím: env.EMAIL_FROM

## Környezeti változók (szükségesek)
DATABASE_URL, RESEND_API_KEY, WORKSHOP_EMAIL, EMAIL_FROM,
NEXT_PUBLIC_APP_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN,
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

## Projekthatárok (v1)
- NEM kell hiteles elektronikus aláírás (eIDAS)
- NEM kell admin felület (v2-re halasztva)
- NEM kell fizetési integráció
- NEM kell valós idejű nyomkövetés/értesítés
- Az aláírás jogilag NEM minősül hiteles aláírásnak — belső nyilvántartáshoz elegendő

## Mappastruktúra
```
/app/
  page.tsx             – Főoldal (link a formhoz)
  layout.tsx           – Root layout
  globals.css          – Tailwind import
  /form/page.tsx       – Kárfelvételi űrlap (multi-step)
  /success/page.tsx    – Sikeres beküldés visszaigazolás
  /api/submit/route.ts – POST endpoint (validáció → DB → email)
/components/
  /FormSteps/          – Step1..Step5 komponensek
  /ui/                 – Button, Input, Label, Textarea, Checkbox
/lib/                  – Szerver oldali logika (prisma.ts, supabase.ts, stb.)
/emails/               – Resend email sablonok
/prisma/
  schema.prisma        – Adatbázis séma
```
