import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-4">Digitális Kárfelvételi Modul</h1>
      <p className="text-gray-600 mb-8">Autószerelő műhely kárfelvételi rendszer</p>
      <Link
        href="/form"
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Kárfelvétel indítása
      </Link>
    </main>
  );
}
