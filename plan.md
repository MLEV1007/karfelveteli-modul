# Integracios terv — Meghatalmazas + Munkalap a digitalis karfelveteli modulba

## Kiindulo allapot
- A jelenlegi rendszer Next.js 14 App Router alapú, 6 lépéses wizarddal dolgozik.
- Az adatok egyetlen `DamageReport` rekordban, Zod validacioval mennek at.
- A bekuldesi folyamat mar most is: validacio -> DB -> signature upload -> PDF -> email.
- A PDF generalas backend oldalon, `@react-pdf/renderer`-rel tortenik.
- Az alairasok PNG-kent kerulnek Supabase Storage-ba, a DB-ben csak URL marad.

## Javasolt megkozelites
- Egyetlen kozos adatmodell legyen a forras, es ebbol szarmazzon minden ertesites, meghatalmazas, munkalap es PDF oldalpár.
- A customer-facing felulet csak az adat-egyeztetest, a fotozast, a meghatalmazast es a jovahagyo alairast kezelje.
- A technikusi mezok kulon, jogosultsaghoz kotott munkafolyamatban jelenjenek meg, de ugyanazt a rekordot toltsek.
- A vegso kimenet egyetlen, fix sorrendu PDF, amelynek oldalsorrendje nem valtozhat.

## 1. UI/UX workflow
1. Alapadatok es jarmu adatok.
2. Karfelvetel fotokkal es karleirassal.
3. Meghatalmazas blokk, beleertve az ugyfel alairast.
4. Technikus munkalapja, de csak belso/jogosult feluleten: km oraallas, anyagok, munkadij, munkatipus, atveteli/visszaadasi idok.
5. Lezaro ellenorzes es bekuldes.

Megjegyzes: az ugyfel csak a sajat adatait, az egyeztetest es az alairasokat vegzi; a munkalap szerkesztese technikusi szerepkorhoz kotott.

## 2. Data mapping
Kozos mezok, amelyeket egyetlen rekordbol kell etetni:
- szemelyes adatok: nev, cim, telefon, email
- jarmu adatok: rendszam, tipus, alvazszam, evjarat
- biztosito adatok: biztositotarsasag, casco/felelossegbiztosito
- kar es idopont: kar esemeny ideje, atveteli/visszaadasi idok
- hitelesites: ugyfel alairas, szerviz/technikus alairas, pecsetkep
- workshop fix adatok: cegnev, adoszam, bankszamlaszam

Irasi elv:
- a formulaban legyen egy kozos draft state
- a wizard lepesek csak szeletelik a kozos state-et
- a meghatalmazas es munkalap ugyanazt a DTO-t kapja, nem kulon bekert masolatot

## 3. PDF generalas es merge architektura
- A jelenlegi `lib/pdf.tsx` marad a backend kompozitor.
- A negy dokumentumresz kulon render-komponens legyen:
  1. Karbejelento
  2. Meghatalmazas
  3. Iratosszesito
  4. Jegyzokonyv / Munkalap
- Elsodleges megoldas: egyetlen React PDF dokumentum, fix sorrendu oldalakra fuzve.
- Ha kulon sablonokra is szukseg van, akkor szerver oldali merge `pdf-lib`-bel tortenjen, de csak a vegso, egyfajlos outputig.
- Az alairasok es kepes elemek base64 vagy biztonsagos, szerver oldali letoltes utan keruljenek beazazasra.

## 4. Validacio es kivetelek
- Zod schema szinten legyen szetbontva stepenkent es kozos, vegso validacio is.
- Hibak:
  - hianyzik kotelezo mezo -> ne lehessen tovabblepni / bekuldeni
  - hibas VIN -> fix hossz- es formatumellenorzes
  - hianyozo alairas -> a bekuldes alljon meg
- Az alairas PNG-kent maradjon tarolva, a PDF csak beemeli az URL-bol vagy letoltott binarisbol.
- Ha a PDF vagy email resz hibazik, a rekord ne vesszen el, de a hiba legyen explicit logolva es ujraprobalkozhato.

## Megvalositasi todo-k
1. A wizard ujrastrukturalasa es a customer/technikus valasztvonal bevezetese.
2. Kozos adat-lekepzesi layer kialakitasa a form state es a dokumentum DTO kozott.
3. Meghatalmazas es munkalap sablonok felbontasa, majd a vegso PDF osszeallito reteg megirasa.
4. Zod validacio erositese, beleertve a VIN, idopont es alairas szabalyokat.
5. Email es attachment flow illesztese az uj egyesitett PDF-hez.

## Megjegyzesek
- A projekt jelenlegi allapota mar ad egy jo alapot: egyetlen rekord, egyetlen submit route, egyetlen PDF/email pipeline.
- A legnagyobb valtozas nem az adatok mennyisege, hanem a szerepkor-alapu adatbevitel es a dokumentum-osszeallitas lesz.
- A vegso PDF sorrendje fix; ezt kodszinten array-alapu kompozicioval kell kenyszeriteni.
