// Fix szerviz/márka adatok — a kárbejelentő fejlécén megjelenő brand
export const WORKSHOP_BRAND = {
  name: "M1 SZERVIZ TATA",
  tagline: "Autóüveg · Karosszéria · Autószerviz",
  address: "2890 Tata, Kalapács u. 1.",
  phone: "0670/540-1062",
  website: "www.m1szerviztata.hu",
}

// Fix, jogi/számlázási entitás adatai — a Meghatalmazás és a Jegyzőkönyv dokumentumokon
// szerepelnek, mert ezek a dokumentumok a bejegyzett vállalkozást azonosítják, nem a brandet.
export const WORKSHOP_LEGAL = {
  companyName: "AUTÓÜVEG SZERVIZ Szinak Gábor e.v.",
  taxNumber: "66894892-1-31",
  bankAccount: "11600006-00000000-30165030",
  location: "Tata",
  address: "2890 Tata, Kalapács u. 1.",
}
