import { db } from '@/lib/db';
import { runSemEscopoDeEmpresa } from '@/lib/tenant';
import { exigirAdminPlataforma } from '@/lib/plataforma';

/**
 * Faturamento dos clientes — registro, não gateway.
 *
 * A decisão de escopo é deliberada e vale a pena estar escrita: NÃO há
 * integração de pagamento aqui. Com um punhado de contratos, PIX e boleto
 * manual resolvem, e cobrança recorrente automatizada é obra grande (webhook,
 * conciliação, retentativa, chargeback, cadastro de meio de pagamento). O que
 * de fato faltava não era cobrar sozinho — era **não esquecer de faturar** e
 * saber quem não pagou.
 *
 * Tudo aqui é control plane: exige admin de plataforma e roda fora do escopo
 * de tenant. Nenhuma destas funções pode ser alcançada pelo app do cliente.
 */

export type StatusCobranca = 'PENDENTE' | 'PAGA' | 'CANCELADA';

export interface LinhaCobranca {
  id: string;
  empresaId: string;
  empresaNome: string;
  competencia: string;
  valor: number;
  dataVencimento: Date;
  status: StatusCobranca;
  dataPagamento: Date | null;
  observacao: string | null;
  /** Dias de atraso (0 se em dia ou já paga). */
  diasAtraso: number;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** Competência do mês corrente, no formato AAAA-MM. */
export function competenciaAtual(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Valida e normaliza uma competência AAAA-MM. Lança se vier torta. */
export function normalizarCompetencia(v: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(v.trim());
  if (!m) throw new Error('Competência deve estar no formato AAAA-MM.');
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) throw new Error('Mês inválido na competência.');
  return `${m[1]}-${m[2]}`;
}

/**
 * Data de vencimento de uma competência, dado o dia do contrato.
 *
 * O dia é limitado a 1–28 no cadastro justamente para esta conta não precisar
 * de exceção: 29, 30 e 31 não existem em todo mês, e um vencimento que
 * escorrega em fevereiro é o tipo de detalhe que vira discussão com o cliente.
 */
export function vencimentoDe(competencia: string, dia: number): Date {
  const [ano, mes] = normalizarCompetencia(competencia).split('-').map(Number);
  const diaSeguro = Math.min(Math.max(1, Math.trunc(dia)), 28);
  return new Date(ano, mes - 1, diaSeguro);
}

function atraso(l: { status: string; dataVencimento: Date }): number {
  if (l.status !== 'PENDENTE') return 0;
  const dias = Math.floor((Date.now() - l.dataVencimento.getTime()) / DIA_MS);
  return dias > 0 ? dias : 0;
}

/**
 * Gera as cobranças de uma competência para todo cliente com contrato ativo.
 *
 * É REPETÍVEL: o unique (empresaId, competencia) e o `skipDuplicates` garantem
 * que rodar duas vezes no mesmo mês não cobra duas vezes. Isso importa porque
 * a geração é manual — quem clica não deve precisar lembrar se já clicou.
 *
 * Só entram empresas ativas COM `valorMensal` definido. Empresa sem valor é
 * cortesia, piloto ou a raiz da instância: ausência de valor é a forma de
 * dizer "este não se cobra", e não um cadastro pela metade.
 */
export async function gerarCobrancasDoMes(
  competenciaBruta: string,
): Promise<{ competencia: string; geradas: number; jaExistiam: number; semContrato: number }> {
  await exigirAdminPlataforma();
  const competencia = normalizarCompetencia(competenciaBruta);

  return runSemEscopoDeEmpresa(async () => {
    const empresas = await db.empresa.findMany({
      where: { ativa: true },
      select: { id: true, valorMensal: true, diaVencimento: true },
    });

    const cobraveis = empresas.filter((e) => e.valorMensal !== null && e.valorMensal > 0);
    const semContrato = empresas.length - cobraveis.length;

    const antes = await db.cobranca.count({ where: { competencia } });

    await db.cobranca.createMany({
      data: cobraveis.map((e) => ({
        empresaId: e.id,
        competencia,
        valor: e.valorMensal as number,
        dataVencimento: vencimentoDe(competencia, e.diaVencimento ?? 10),
      })),
      skipDuplicates: true,
    });

    const depois = await db.cobranca.count({ where: { competencia } });

    return {
      competencia,
      geradas: depois - antes,
      jaExistiam: cobraveis.length - (depois - antes),
      semContrato,
    };
  });
}

/** Cobranças de uma competência, com o nome da empresa resolvido. */
export async function cobrancasDaCompetencia(competenciaBruta: string): Promise<LinhaCobranca[]> {
  await exigirAdminPlataforma();
  const competencia = normalizarCompetencia(competenciaBruta);

  return runSemEscopoDeEmpresa(async () => {
    const linhas = await db.cobranca.findMany({
      where: { competencia },
      orderBy: { dataVencimento: 'asc' },
    });

    // Sem FK, o nome vem de uma busca separada — o preço de manter o histórico
    // financeiro vivo depois de a empresa ser removida.
    const empresas = await db.empresa.findMany({
      where: { id: { in: linhas.map((l) => l.empresaId) } },
      select: { id: true, nome: true },
    });
    const nomePorId = new Map(empresas.map((e) => [e.id, e.nome]));

    return linhas.map((l) => ({
      id: l.id,
      empresaId: l.empresaId,
      empresaNome: nomePorId.get(l.empresaId) ?? '(instância removida)',
      competencia: l.competencia,
      valor: l.valor,
      dataVencimento: l.dataVencimento,
      status: l.status as StatusCobranca,
      dataPagamento: l.dataPagamento,
      observacao: l.observacao,
      diasAtraso: atraso(l),
    }));
  });
}

/** Todas as pendentes, de qualquer competência — o que está em aberto de fato. */
export async function pendentesEmAberto(): Promise<LinhaCobranca[]> {
  await exigirAdminPlataforma();

  return runSemEscopoDeEmpresa(async () => {
    const linhas = await db.cobranca.findMany({
      where: { status: 'PENDENTE' },
      orderBy: { dataVencimento: 'asc' },
    });
    const empresas = await db.empresa.findMany({
      where: { id: { in: linhas.map((l) => l.empresaId) } },
      select: { id: true, nome: true },
    });
    const nomePorId = new Map(empresas.map((e) => [e.id, e.nome]));

    return linhas.map((l) => ({
      id: l.id,
      empresaId: l.empresaId,
      empresaNome: nomePorId.get(l.empresaId) ?? '(instância removida)',
      competencia: l.competencia,
      valor: l.valor,
      dataVencimento: l.dataVencimento,
      status: l.status as StatusCobranca,
      dataPagamento: l.dataPagamento,
      observacao: l.observacao,
      diasAtraso: atraso(l),
    }));
  });
}

/** Baixa de pagamento ou cancelamento. */
export async function atualizarCobranca(
  id: string,
  dados: { status?: StatusCobranca; dataPagamento?: Date | null; observacao?: string | null },
): Promise<void> {
  await exigirAdminPlataforma();

  return runSemEscopoDeEmpresa(async () => {
    const patch: Record<string, unknown> = {};
    if (dados.status) {
      patch.status = dados.status;
      // Marcar como paga sem data é o caminho natural do clique rápido; a data
      // de hoje é a resposta certa e evita um campo obrigatório a mais.
      if (dados.status === 'PAGA') patch.dataPagamento = dados.dataPagamento ?? new Date();
      if (dados.status !== 'PAGA') patch.dataPagamento = null;
    } else if (dados.dataPagamento !== undefined) {
      patch.dataPagamento = dados.dataPagamento;
    }
    if (dados.observacao !== undefined) patch.observacao = dados.observacao;

    await db.cobranca.update({ where: { id }, data: patch });
  });
}
