import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Masar Empreendimentos | Gestão de Medições e Fluxo de Caixa CEF",
  description: "SaaS B2B para controle de fluxo de caixa, evolução de obras e medições da Caixa Econômica Federal (MCMV).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#0b0f19] text-slate-100 flex flex-col">
        {children}
      </body>
    </html>
  );
}
