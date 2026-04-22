import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kárfelvételi Modul",
  description: "Digitális kárfelvételi webalkalmazás autószerelő műhelyeknek",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body>
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/logo"
              alt="M1 Szerviz Tata"
              style={{ height: 140, width: "auto", objectFit: "contain" }}
            />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
