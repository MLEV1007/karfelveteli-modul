import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "ÁSZF — M1 Szerviz Tata",
  description: "Általános Szerződési Feltételek — M1 Szerviz Tata",
}

const EFFECTIVE_DATE = "2026. november 20."

const sections: { title: string; paragraphs: string[] }[] = [
  {
    title: "Garancia",
    paragraphs: [
      "A garancia beázásra akár „élettartamra” is szólhat (amennyiben a karosszéria állapota ezt megengedi). Ez teljes körűen vonatkozik az Ön autóján elvégzett autóüveg-javítási, illetve -beépítési munkákra!",
      "Szakmai tapasztalatunk mellett a beépített gyári beszállítói szélvédőknek és a felhasznált csúcsminőségű ragasztóanyagoknak köszönhetően kevés esély van arra, hogy bármilyen probléma előforduljon. Azonban ha bármilyen jellegű észrevétele, kifogása lenne beázás, üvegtorzítás vagy fóliásodás miatt, természetesen garanciálisan kijavítjuk, sőt, ha szükséges, cseréljük az üveget!",
    ],
  },
  {
    title: "Mi történik, ha elreped a szélvédő?",
    paragraphs: [
      "Ha ez a beépítés után 7 napon belül történik meg, és látható külsérelmi nyom nincs, akkor a szélvédőt garanciában cseréljük. Ebben az időintervallumban a szélvédőragasztó teljes keresztmetszetében átköt, a napi használat következtében pedig a korábban nem látható sérülések láthatóvá válhatnak.",
      "A későbbiekben keletkező sérülések a gépkocsi előéletéből – akár évekkel korábbi sérüléséből –, de a napi használatból is adódhatnak. Például nyáron, felhevült szélvédővel autómosóba megyünk, és a hideg víz hatására megreccsen az üveg. Az sem ritka, hogy egy apró kavics szinte észrevétlenül megsérti a szélvédőt, esetleg egy tompa ütés következtében indul el a repedés. Előfordulhat az is, hogy az ablaktörlőlapát cseréje alkalmával a rugós kar rácsapódik a szélvédőre.",
      "Látható, hogy a sérülés oka sok esetben nehezen állapítható meg, így a felelősség kérdése sem egyértelmű. Az üveggyárak nem vállalnak garanciát a szélvédő ilyen jellegű sérüléseire, ezért erre sajnos mi sem tudunk garanciát vállalni.",
    ],
  },
  {
    title: "Fontos tudnivaló a szélvédő kiszerelésével járó munkálatokról",
    paragraphs: [
      "Amennyiben a gépjármű szélvédőjének kiszerelésére az ügyfél saját kérésére, vagy a szerviz által végzett hibamegállapítás, illetve szakmai javaslat alapján kerül sor, felhívjuk a figyelmet arra, hogy az ilyen jellegű munkálatok fokozott kockázattal járhatnak.",
      "A szélvédő kiszerelése során, illetve az üvegtermék sajátosságaiból adódóan korábban nem látható mikrosérülések válhatnak láthatóvá, az üveg megrepedhet vagy akár el is törhet. Ez különösen előfordulhat a gépjármű karosszériájának korábbi sérülése, deformációja, feszülése vagy egyéb szerkezeti sajátossága miatt. Az ilyen jellegű károsodások megfelelő szakmai körültekintés mellett sem minden esetben előzhetők meg.",
      "Az ügyfél a munkálatok elvégzéséhez adott hozzájárulásával tudomásul veszi és elfogadja az ismertetett kockázatokat. A szerviz az ilyen munkálatok során az üveg esetleges, annak sajátosságaiból vagy a gépjármű korábbi állapotából eredő sérülésére, repedésére, törésére, illetve az ezekből következő cserére nem vállal garanciát. Az ilyen esetekből eredő további javítás vagy üvegcsere költsége az ügyfelet terheli.",
      "A fentiek egyaránt vonatkoznak az ügyfél saját kérésére, valamint a szerviz szakmai javaslatára elvégzett szélvédő-kiszerelési munkálatokra is.",
    ],
  },
  {
    title: "Szélvédőjavítás esetén",
    paragraphs: [
      "Ha a feltöltött kőfelverődés 30 napon belül elreped, akkor a nálunk megrendelt szélvédőcsere árából a korábbi javítás árának a felét levonjuk.",
    ],
  },
]

export default function AszfPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 mb-6"
        >
          Vissza a főoldalra
        </Link>

        <section className="bg-white rounded-lg shadow-sm border border-gray-100 px-6 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Általános Szerződési Feltételek</h1>
          <p className="text-sm text-gray-400 mb-8">Hatályos: {EFFECTIVE_DATE}</p>

          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Szolgáltató adatai</h2>
              <p className="text-sm leading-relaxed text-gray-600">
                <strong className="text-gray-900">M1 Szerviz Tata Korlátolt Felelősségű Társaság</strong>
                <br />
                Székhely: 2890 Tata, Kalapács utca 1.
                <br />
                Adószám: 14169931-2-11
                <br />
                Telefon:{" "}
                <a href="tel:+36705401062" className="text-blue-600 hover:underline">
                  06 70 540 1062
                </a>
                <br />
                E-mail:{" "}
                <a href="mailto:m1szelvedo@gmail.com" className="text-blue-600 hover:underline">
                  m1szelvedo@gmail.com
                </a>
              </p>
            </div>

            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="text-lg font-bold text-gray-900 mb-3">{section.title}</h2>
                <div className="space-y-3">
                  {section.paragraphs.map((text) => (
                    <p key={text.slice(0, 40)} className="text-sm leading-relaxed text-gray-600">
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Garanciális igény bejelentése</h2>
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-gray-600">
                  Ha garanciális problémát észlel, kérjük, mielőbb jelezze nekünk telefonon vagy e-mailben.
                  A bejelentéshez kérjük, adja meg a gépjármű rendszámát, a munka elvégzésének időpontját és a
                  probléma rövid leírását, lehetőség szerint fényképpel. A számlát vagy a munkalapot kérjük,
                  tartsa kéznél.
                </p>
                <p className="text-sm leading-relaxed text-gray-600">
                  Az üveg és a beépítés állapotát a szervizben mérjük fel, a javítást vagy cserét előre
                  egyeztetett időpontban végezzük el.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Hatály és módosítás</h2>
              <p className="text-sm leading-relaxed text-gray-600">
                Jelen ÁSZF a fent megjelölt naptól hatályos. A szerviz fenntartja a jogot a feltételek
                módosítására; a mindenkori hatályos változat a weboldalon érhető el.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
