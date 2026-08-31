// Fix szerviz/márka adatok — a kárbejelentő fejlécén megjelenő brand
export const WORKSHOP_BRAND = {
  name: "M1 SZERVIZ TATA",
  tagline: "Autóüveg · Karosszéria · Autószerviz",
  address: "2890 Tata, Kalapács u. 1.",
  phone: "0670/540-1062",
  website: "www.m1szerviztata.hu",
}

// Fix, jogi/számlázási entitások adatai — mindhárom önálló Meghatalmazás-dokumentumon
// szerepelnek, mert ez a dokumentum a bejegyzett vállalkozásokat azonosítja, nem a brandet.
//
// Minden entitáshoz külön, egymástól független Meghatalmazás-PDF készül (lásd
// lib/pdf/AuthorizationPage.tsx és lib/pdf/index.tsx generateAuthorizationPdfs) — egyik
// dokumentum sem hivatkozik a másik két cégre.
export interface LegalEntity {
  key: string // pl. "m1", "autouveg", "bodrogi" — fájlnevekhez és PDF/UI listákhoz
  companyName: string
  taxNumber: string
  bankAccount: string
  location?: string
}

export const WORKSHOP_LEGAL_M1: LegalEntity = {
  key: "m1",
  companyName: "M1 Szerviz Tata Kft.",
  taxNumber: "14169931-2-11",
  bankAccount: "10918001-00000055-61630008",
  location: "Tata",
}

export const WORKSHOP_LEGAL_AUTOUVEG: LegalEntity = {
  key: "autouveg",
  companyName: "Autóüveg Szerviz Szinak Gábor e.v.",
  taxNumber: "66894892-1-31",
  bankAccount: "11600006-00000000-30165030",
}

export const WORKSHOP_LEGAL_KAROSSZERIA: LegalEntity = {
  key: "bodrogi",
  companyName: "M1 Karosszéria Tata: Bodrogi Róbert e.v.",
  taxNumber: "55744157-1-31",
  bankAccount: "11600006-00000000-85487385",
}

// A 3 jogi entitás listája — ebből dolgozik a PDF-generálás (3 önálló meghatalmazás-PDF)
// és a Step6Authorization online űrlap-lépés is, hogy egy helyen kelljen karbantartani.
export const WORKSHOP_LEGAL_ENTITIES: LegalEntity[] = [
  WORKSHOP_LEGAL_M1,
  WORKSHOP_LEGAL_AUTOUVEG,
  WORKSHOP_LEGAL_KAROSSZERIA,
]
