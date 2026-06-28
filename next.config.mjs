/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
  async headers() {
    // Ezek az útvonalak email-ből kapott tokent fogadnak query paraméterben
    // (egyszeri csere session cookie-ra) — no-referrer, hogy a token semmilyen
    // harmadik fél felé ne szivárogjon ki a Referer headerben.
    return [
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
