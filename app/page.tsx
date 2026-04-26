import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero szekció */}
      <section
        className="relative flex-1 flex items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f1f4b 0%, #1a3a7c 60%, #1e4db7 100%)" }}
      >
        {/* Dekoratív autó SVG háttérben */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none select-none"
          aria-hidden="true"
          style={{ width: "60vw", maxWidth: 700 }}
        >
          <svg
            viewBox="0 0 47.032 47.032"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
            fill="white"
          >
            <path d="M29.395,0H17.636c-3.117,0-5.643,3.467-5.643,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759
              c3.116,0,5.644-2.527,5.644-5.644V6.584C35.037,3.467,32.511,0,29.395,0z M34.05,14.188v11.665l-2.729,0.351v-4.806
              L34.05,14.188z M32.618,10.773c-1.016,3.9-2.219,8.51-2.219,8.51H16.631l-2.222-8.51
              C14.41,10.773,23.293,7.755,32.618,10.773z M15.741,21.713v4.492l-2.73-0.349V14.502L15.741,21.713z
              M13.011,37.938V27.579l2.73,0.343v8.196L13.011,37.938z M14.568,40.882l2.218-3.336
              h13.771l2.219,3.336H14.568z M31.321,35.805v-7.872l2.729-0.355v10.048L31.321,35.805z" />
          </svg>
        </div>

        {/* Tartalom */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 py-20 max-w-2xl mx-auto">
          <div
            className="inline-block text-xs font-semibold tracking-widest uppercase mb-6 px-4 py-1.5 rounded-full border"
            style={{ color: "#93c5fd", borderColor: "rgba(147,197,253,0.3)", background: "rgba(147,197,253,0.08)" }}
          >
            M1 Szerviz Tata
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
            Digitális<br />Kárfelvételi Modul
          </h1>

          <p className="text-lg mb-10" style={{ color: "#93c5fd" }}>
            Töltse ki kárbejelentőjét gyorsan, egyszerűen — papír nélkül.
          </p>

          <Link
            href="/form"
            className="inline-flex items-center gap-2 bg-white font-semibold px-8 py-4 rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            style={{ color: "#0f1f4b", fontSize: "1.05rem" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6m9-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Kárfelvétel indítása
          </Link>
        </div>
      </section>

      {/* Feature kártyák */}
      <section className="bg-white py-10 px-6">
        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col items-center text-center p-5 rounded-xl bg-gray-50 border border-gray-100">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
              style={{ background: "#e8f0fe" }}
            >
              <svg className="w-5 h-5" fill="none" stroke="#1a3a7c" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-1">Gyors kitöltés</p>
            <p className="text-xs text-gray-500">Lépésről lépésre vezeti végig a folyamaton</p>
          </div>

          <div className="flex flex-col items-center text-center p-5 rounded-xl bg-gray-50 border border-gray-100">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
              style={{ background: "#e8f0fe" }}
            >
              <svg className="w-5 h-5" fill="none" stroke="#1a3a7c" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-1">Automatikus PDF</p>
            <p className="text-xs text-gray-500">Azonnal generálódik a kárfelvételi dokumentum</p>
          </div>

          <div className="flex flex-col items-center text-center p-5 rounded-xl bg-gray-50 border border-gray-100">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
              style={{ background: "#e8f0fe" }}
            >
              <svg className="w-5 h-5" fill="none" stroke="#1a3a7c" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-1">Email visszaigazolás</p>
            <p className="text-xs text-gray-500">A kitöltés után azonnal kap visszaigazolást</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-5 px-6">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span>© {new Date().getFullYear()} M1 Szerviz Tata — 2890 Tata, Kalapács utca 1.</span>
          <Link
            href="/adatkezeles"
            className="hover:text-gray-600 transition-colors underline underline-offset-2"
          >
            ÁSZF / Adatkezelési tájékoztató
          </Link>
        </div>
      </footer>
    </div>
  );
}
