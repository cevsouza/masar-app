import type { Metadata } from "next";
import DashboardShell from "@/components/DashboardShell";
import { identidadeVisualAtual } from "@/lib/empresaVisual";

// O painel já é dinâmico (depende de sessão), então resolver a empresa aqui não
// custa geração estática — ao contrário do layout raiz.
export async function generateMetadata(): Promise<Metadata> {
  const marca = await identidadeVisualAtual();
  return { title: `${marca.nome} | Gestão de Obras` };
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const marca = await identidadeVisualAtual();

  // As cores do tenant entram como variáveis CSS: qualquer componente pode usar
  // var(--cor-primaria) sem receber a marca por props em cascata.
  return (
    <div
      style={
        {
          "--cor-primaria": marca.corPrimaria,
          "--cor-secundaria": marca.corSecundaria,
        } as React.CSSProperties
      }
      className="contents"
    >
      <DashboardShell empresaNome={marca.nome} ehRaiz={marca.ehRaiz}>{children}</DashboardShell>
    </div>
  );
}
