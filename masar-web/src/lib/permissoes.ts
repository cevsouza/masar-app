/**
 * Permissões finas por MÓDULO — camada pura (Fase 5.2).
 *
 * SEM import de Prisma/DB: é usada no middleware (edge) e no client (Sidebar).
 * Controla acesso a PÁGINAS e menu. As rotas de API continuam checando o papel
 * como backstop de segurança (a matriz refina a VISIBILIDADE dentro do que o
 * papel já pode, não é a fronteira de dados).
 *
 * ADMIN sempre tem todos os módulos. Os demais papéis seguem a matriz
 * (PermissaoPapelModulo); quando não há linha, cai no DEFAULT abaixo — que
 * espelha o comportamento original de acesso (antes da matriz).
 */

export interface ModuloDef {
  chave: string;
  label: string;
  descricao: string;
  prefixos: string[];
}

export const MODULOS: ModuloDef[] = [
  { chave: 'obras', label: 'Obras', descricao: 'Empreendimentos, casas, canteiro e agenda', prefixos: ['/empreendimentos', '/casas', '/canteiro', '/agenda'] },
  { chave: 'suprimentos', label: 'Suprimentos', descricao: 'Compras e fornecedores', prefixos: ['/suprimentos', '/fornecedores'] },
  { chave: 'financeiro', label: 'Financeiro', descricao: 'Central financeira e sócios', prefixos: ['/financeiro', '/socios'] },
  { chave: 'fiscal', label: 'Fiscal', descricao: 'Notas de entrada, impostos e documentos', prefixos: ['/fiscal'] },
  { chave: 'seguranca', label: 'Segurança do Trabalho', descricao: 'Trabalhadores, ASO e EPI', prefixos: ['/trabalhadores'] },
  { chave: 'gestao', label: 'Gestão & BI', descricao: 'Painéis, indicadores e eficiência', prefixos: ['/gestao'] },
  { chave: 'comercial', label: 'Comercial', descricao: 'CRM e vendas', prefixos: ['/comercial'] },
  { chave: 'relatorios', label: 'Relatórios', descricao: 'Relatórios gerenciais', prefixos: ['/relatorios'] },
];

// Papéis configuráveis na matriz (ADMIN é fixo = tudo).
export const PAPEIS_CONFIGURAVEIS = ['FINANCEIRO', 'ENGENHARIA', 'COMERCIAL'] as const;

// Default por papel (espelha o acesso original). ADMIN não entra: tem tudo.
export const DEFAULTS: Record<string, string[]> = {
  FINANCEIRO: ['obras', 'suprimentos', 'financeiro', 'fiscal', 'seguranca', 'gestao', 'comercial', 'relatorios'],
  ENGENHARIA: ['obras', 'seguranca', 'relatorios'],
  COMERCIAL: ['comercial'],
};

export const TODOS_MODULOS = MODULOS.map((m) => m.chave);

// Matriz efetiva: Record<papel, Record<moduloChave, boolean>>.
export type MatrizPermissao = Record<string, Record<string, boolean>>;

// Retorna a chave do módulo que "dona" a rota, ou null se a rota não é de módulo.
export function moduloDaRota(pathname: string): string | null {
  for (const m of MODULOS) {
    if (m.prefixos.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return m.chave;
    }
  }
  return null;
}

// Lista de módulos que um papel pode acessar, considerando a matriz (ou defaults).
export function modulosPermitidos(role: string, matriz?: MatrizPermissao): string[] {
  if (role === 'ADMIN') return [...TODOS_MODULOS];
  const doPapel = matriz?.[role];
  return TODOS_MODULOS.filter((chave) => {
    if (doPapel && Object.prototype.hasOwnProperty.call(doPapel, chave)) return doPapel[chave];
    return (DEFAULTS[role] || []).includes(chave);
  });
}

// A rota é permitida para quem tem `modulos`? Rotas fora de qualquer módulo passam
// (o middleware trata / e /usuarios/permissoes como casos especiais de ADMIN).
export function rotaPermitida(modulos: string[], pathname: string): boolean {
  const chave = moduloDaRota(pathname);
  if (!chave) return true;
  return modulos.includes(chave);
}
