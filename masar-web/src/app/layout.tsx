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

// Título NEUTRO de propósito. Este é o layout raiz: resolver a empresa aqui
// (via generateMetadata, que consulta o banco) tornaria TODA página dinâmica e
// mataria a geração estática. Quem sabe de que empresa é — login e painel —
// sobrescreve com o nome certo; o que sobra aqui é o produto, não o cliente.
export const metadata: Metadata = {
  title: "Gestão de Obras e Medições CEF",
  description: "Controle de fluxo de caixa, evolução de obras e medições da Caixa Econômica Federal (MCMV).",
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
