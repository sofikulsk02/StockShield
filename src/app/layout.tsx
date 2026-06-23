import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StockShield 🛡️ | Real-Time Inventory Reservation System",
  description:
    "An enterprise-grade concurrency-safe inventory holding and order-fulfillment platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body
        className="min-h-full flex flex-col justify-between"
        style={{ fontFamily: "var(--font-outfit), sans-serif" }}
      >
        <div>
          {/* Navigation Header */}
          <header className="sticky top-0 z-50 glass-panel border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 group">
              <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
                StockShield 🛡️
              </span>
            </a>
            <nav className="flex items-center gap-6">
              <a
                href="/"
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Products
              </a>
              <a
                href="/api/health"
                target="_blank"
                className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 transition-colors font-medium"
              >
                API Status: Active
              </a>
            </nav>
          </header>

          {/* Main Content Area */}
          <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
            {children}
          </main>
        </div>

        {/* Footer */}
        <footer className="w-full py-6 mt-12 border-t border-white/5 text-center text-xs text-zinc-500">
          <p>
            © {new Date().getFullYear()} StockShield Inc. — Real-Time
            Concurrency Lock Protection Active.
          </p>
        </footer>
      </body>
    </html>
  );
}
