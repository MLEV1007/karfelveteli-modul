// Fix szerviz/márka adatok — a kárbejelentő fejlécén megjelenő brand
export const WORKSHOP_BRAND = {
  name: "M1 SZERVIZ TATA",
  tagline: "Autóüveg · Karosszéria · Autószerviz",
  address: "2890 Tata, Kalapács u. 1.",
  phone: "0670/540-1062",
  website: "www.m1szerviztata.hu",
}

// Fix, jogi/számlázási entitások adatai — a Meghatalmazás dokumentumon szerepelnek,
// mert ez a dokumentum a bejegyzett vállalkozásokat azonosítja, nem a brandet.
//
// WORKSHOP_LEGAL_M1 az elsődleges, ügyfél felé megjelenő meghatalmazott. A másik két
// egyéni vállalkozás közreműködőként van jelen a kárügyintézésben (lásd Meghatalmazás
// dokumentum záradéka) — ők csak a PDF jogi szövegében szerepelnek, az ügyfél felé
// megjelenő fő szöveg és a kitöltési lépés kizárólag az M1 Szerviz Tata Kft.-t nevezi meg.
export const WORKSHOP_LEGAL_M1 = {
  companyName: "M1 Szerviz Tata Kft.",
  taxNumber: "14169931-2-11",
  bankAccount: "10918001-00000055-61630008",
  location: "Tata",
}

export const WORKSHOP_LEGAL_AUTOUVEG = {
  companyName: "Autóüveg Szerviz Szinak Gábor e.v.",
  taxNumber: "66894892-1-31",
  bankAccount: "11600006-00000000-30165030",
}

export const WORKSHOP_LEGAL_KAROSSZERIA = {
  companyName: "MI Karosszéria Tata: Bodrogi Róbert e.v.",
  taxNumber: "55744157-1-31",
  bankAccount: "11600006-00000000-85487385",
}
