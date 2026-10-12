import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeutschStart — Learn German (A1)",
  description:
    "A focused, single-user German course for English speakers. A1 level: vocabulary, grammar, listening, spaced-repetition review.",
};

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/review", label: "Review" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-900 text-[11px] font-bold text-amber-400">
                DE
              </span>
              DeutschStart
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-md px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-400">
          DeutschStart v1 · A1 course · progress stored locally
        </footer>
      </body>
    </html>
  );
}
