import type { Metadata } from "next";
import Image from "next/image";
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
          <div className="max-w-2xl mx-auto px-4 h-20 flex items-center justify-center">
            <Image
              src="/api/logo"
              alt="M1 Szerviz Tata"
              width={200}
              height={70}
              style={{ objectFit: "contain", height: 64, width: "auto" }}
              priority
            />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
