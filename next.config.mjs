/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
  async headers() {
    // Admin felület (oldalak és API-k): MIME-sniffing tiltása, nincs Referer-szivárgás, nem keretezhető
    // (clickjacking ellen). A no-store / noindex fejléceket a middleware adja.
    const adminSecurityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Frame-Options", value: "DENY" },
    ]
    // Ezek az útvonalak email-ből kapott tokent fogadnak query paraméterben
    // (egyszeri csere session cookie-ra) — no-referrer, hogy a token semmilyen
    // harmadik fél felé ne szivárogjon ki a Referer headerben.
    return [
      // /admin/munkalap/* (technikusi, tokenes oldal) kimarad: arra csak a lenti Referrer-Policy szabály vonatkozik
      { source: "/admin", headers: adminSecurityHeaders },
      { source: "/admin/:path((?!munkalap(?:/|$)).*)", headers: adminSecurityHeaders },
      { source: "/api/admin/:path*", headers: adminSecurityHeaders },
      {
        source: "/edit/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source: "/admin/munkalap/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source: "/api/edit/session",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source: "/api/munkalap/session",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ]
  },
}

export default nextConfig
