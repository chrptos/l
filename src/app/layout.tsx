import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: { default: "Manabi — オンライン学習プラットフォーム", template: "%s | Manabi" },
  description: "誰でも学べて、誰でも教えられるオンライン学習プラットフォーム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="mt-16 bg-gray-900 py-10 text-sm text-gray-400">
          <div className="container-page flex flex-wrap justify-between gap-4">
            <span className="font-black text-white">Manabi.</span>
            <span>© {new Date().getFullYear()} Manabi LMS</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
