import { db } from '@/lib/db';
import { buscarVencimentosSST } from '@/lib/sst';

/**
 * Completude do Cadastro — motor de onboarding/qualidade de dados (Fase 8.1).
 *
 * Verifica, de forma determinística e read-only, se cada empreendimento tem os
 * dados que a "gestão do todo" precisa. Cada item vira um ponto de checklist com
 * status (COMPLETO/PARCIAL/PENDENTE), o que falta e o link da tela onde resolver.
 *
 * Distinção-chave:
 *  - obrigatorio=true  → dado que os MOTORES (EVM/MRP/SST/fluxo) consomem. Sem
 *    ele, os indicadores e recomendações não fecham.
 *  - obrigatorio=false → boa prática / compliance (recomendado, não trava a conta).
 *
 * O score é uma média ponderada (obrigatório pesa 2, recomendado 1; PARCIAL = 0,5).
 * Serve tanto para o painel de completude (8.1) quanto para o wizard guiado (8.2),
 * que consome a MESMA lista em ordem — uma única fonte de verdade.
 */

export type StatusItem = 'COMPLETO' | 'PARCIAL' | 'PENDENTE';

export interface ItemCompletude {
  chave: string;
  grupo: string;
  label: string;
  status: StatusItem;
  obrigatorio: boolean;
  detalhe: string; // o estado atual / o que falta
  acao?: string; // o que fazer para completar
  href: string;
  telaLabel: string;
}

export interface CompletudeEmpreendimento {
  id: string;
  nome: string;
  scorePct: number; // 0..100 (ponderado)
  totalItens: number;
  completos: number;
  parciais: number;
  pendentes: number;
  faltamObrigatorios: number; // itens obrigatórios não-completos
  itens: ItemCompletude[];
}

export interface CompletudeResult {
  resumo: {
    empreendimentos: number;
    scoreMedioPct: number; // média dos scores por empreendimento
    faltamObrigatorios: number; // Σ obrigatórios pendentes/parciais (emp. + base)
  };
  empreendimentos: CompletudeEmpreendimento[];
  compartilhados: {
    scorePct: number;
    itens: ItemCompletude[];
  };
}

const semPfx = (s: string) => s.replace('[SEED] ', '');
const peso = (obrigatorio: boolean) => (obrigatorio ? 2 : 1);
const valor = (s: StatusItem) => (s === 'COMPLETO' ? 1 : s === 'PARCIAL' ? 0.5 : 0);

// Score ponderado de uma lista de itens (0..100).
function calcularScore(itens: ItemCompletude[]): number {
  const totalPeso = itens.reduce((a, i) => a + peso(i.obrigatorio), 0);
  if (totalPeso === 0) return 100;
  const ganho = itens.reduce((a, i) => a + peso(i.obrigatorio) * valor(i.status), 0);
  return Math.round((ganho / totalPeso) * 100);
}

// Traduz "quantos de N estão OK" em status parcial/completo/pendente.
function statusDeContagem(ok: number, total: number): StatusItem {
  if (total === 0 || ok === 0) return 'PENDENTE';
  if (ok >= total) return 'COMPLETO';
  return 'PARCIAL';
}

const PROJETOS_ESSENCIAIS = [
  'PROJETO_ARQUITETONICO',
  'PROJETO_ESTRUTURAL',
  'PROJETO_HIDRAULICO',
  'PROJETO_ELETRICO',
] as const;

export async function calcularCompletude(): Promise<CompletudeResult> {
  const [emps, insumos, fornecedoresAtivos, trabalhadoresAtivos, sst] = await Promise.all([
    db.empreendimento.findMany({
      orderBy: { dataCriacao: 'asc' },
      include: {
        casas: {
          select: {
            id: true,
            prazoFisico: true,
            orcamento: { select: { _count: { select: { itens: true } } } },
            linhaBase: { select: { id: true } },
          },
        },
        documentos: { select: { tipo: true } },
        marcos: { select: { id: true } },
        _count: { select: { transacoes: true } },
      },
    }),
    db.insumoPadrao.findMany({ select: { categoria: true, nivelMinimoEstoque: true } }),
    db.fornecedor.count({ where: { ativo: true } }),
    db.trabalhador.count({ where: { ativo: true } }),
    buscarVencimentosSST(),
  ]);

  // ── Por empreendimento ──────────────────────────────────────────────────────
  const empreendimentos: CompletudeEmpreendimento[] = emps.map((e) => {
    const nome = semPfx(e.nome);
    const href = `/empreendimentos/${e.id}`;
    const itens: ItemCompletude[] = [];

    const nCasas = e.casas.length;
    const casasComPrazo = e.casas.filter((c) => c.prazoFisico != null).length;
    const casasComOrcamento = e.casas.filter((c) => (c.orcamento?._count.itens ?? 0) > 0).length;
    const casasComBase = e.casas.filter((c) => c.linhaBase != null).length;

    // 1 · Identificação / endereço (recomendado — não entra nos motores)
    {
      const temEndereco = !!(e.cidade && e.estado);
      const temTerreno = e.areaTotalTerreno != null && e.quantidadeCasasPrevistas != null;
      const ok = (temEndereco ? 1 : 0) + (temTerreno ? 1 : 0);
      itens.push({
        chave: 'identificacao',
        grupo: 'Identificação',
        label: 'Dados do empreendimento (endereço, terreno, nº de casas)',
        status: statusDeContagem(ok, 2),
        obrigatorio: false,
        detalhe: [
          temEndereco ? null : 'sem cidade/estado',
          temTerreno ? null : 'sem área do terreno / casas previstas',
        ]
          .filter(Boolean)
          .join('; ') || 'endereço e terreno preenchidos',
        acao: 'Complete os dados na ficha do empreendimento.',
        href,
        telaLabel: 'Ficha do Empreendimento',
      });
    }

    // 2 · Prazo do empreendimento (recomendado)
    {
      const temDatas = e.dataInicio != null && e.dataFim != null;
      itens.push({
        chave: 'prazo-empreendimento',
        grupo: 'Identificação',
        label: 'Prazo do empreendimento (início e fim)',
        status: temDatas ? 'COMPLETO' : e.dataInicio || e.dataFim ? 'PARCIAL' : 'PENDENTE',
        obrigatorio: false,
        detalhe: temDatas ? 'início e fim definidos' : 'defina data de início e de fim previstos',
        acao: 'Preencha as datas na ficha do empreendimento.',
        href,
        telaLabel: 'Ficha do Empreendimento',
      });
    }

    // 3 · Casas cadastradas (OBRIGATÓRIO — nada funciona sem unidades)
    {
      const previstas = e.quantidadeCasasPrevistas ?? 0;
      let status: StatusItem = 'PENDENTE';
      if (nCasas > 0) status = previstas > 0 && nCasas < previstas ? 'PARCIAL' : 'COMPLETO';
      itens.push({
        chave: 'casas',
        grupo: 'Unidades',
        label: 'Casas/unidades cadastradas',
        status,
        obrigatorio: true,
        detalhe:
          nCasas === 0
            ? 'nenhuma casa cadastrada'
            : previstas > 0
              ? `${nCasas} de ${previstas} casas previstas`
              : `${nCasas} casa(s) cadastrada(s)`,
        acao: 'Cadastre as unidades em Obras (ou no gerador de casas do empreendimento).',
        href: '/casas',
        telaLabel: 'Obras',
      });
    }

    // 4 · Prazo físico por casa (OBRIGATÓRIO — EVM precisa da linha de tempo/PV)
    {
      itens.push({
        chave: 'prazos-casas',
        grupo: 'Unidades',
        label: 'Prazo físico das casas (base do EVM/cronograma)',
        status: statusDeContagem(casasComPrazo, nCasas),
        obrigatorio: true,
        detalhe:
          nCasas === 0
            ? 'cadastre casas primeiro'
            : `${casasComPrazo} de ${nCasas} casas com prazo físico`,
        acao: 'Defina o prazo físico de cada casa para o EVM calcular avanço planejado (SPI).',
        href: '/casas',
        telaLabel: 'Obras',
      });
    }

    // 5 · Orçamento por casa (OBRIGATÓRIO — CPI/EAC e MRP dependem disto)
    {
      itens.push({
        chave: 'orcamento-casas',
        grupo: 'Orçamento & Base',
        label: 'Orçamento por casa (itens/insumos)',
        status: statusDeContagem(casasComOrcamento, nCasas),
        obrigatorio: true,
        detalhe:
          nCasas === 0
            ? 'cadastre casas primeiro'
            : `${casasComOrcamento} de ${nCasas} casas com orçamento`,
        acao: 'Monte o orçamento de insumos de cada casa — é o que alimenta custo, EVM e necessidade de materiais.',
        href: '/casas',
        telaLabel: 'Obras',
      });
    }

    // 6 · Linha de base congelada (recomendado — mede o drift do plano)
    {
      itens.push({
        chave: 'linha-base',
        grupo: 'Orçamento & Base',
        label: 'Linha de base congelada',
        status: statusDeContagem(casasComBase, nCasas),
        obrigatorio: false,
        detalhe:
          nCasas === 0
            ? 'cadastre casas primeiro'
            : `${casasComBase} de ${nCasas} casas com linha de base`,
        acao: 'Congele a linha de base após fechar o orçamento para medir desvios do plano ao longo da obra.',
        href: '/gestao/linha-base',
        telaLabel: 'Linha de Base',
      });
    }

    // 7 · Projetos essenciais no cofre (recomendado — compliance)
    {
      const tipos = new Set(e.documentos.map((d) => d.tipo));
      const presentes = PROJETOS_ESSENCIAIS.filter((t) => tipos.has(t as any));
      const faltando = PROJETOS_ESSENCIAIS.filter((t) => !tipos.has(t as any));
      const rotulo: Record<string, string> = {
        PROJETO_ARQUITETONICO: 'arquitetônico',
        PROJETO_ESTRUTURAL: 'estrutural',
        PROJETO_HIDRAULICO: 'hidráulico',
        PROJETO_ELETRICO: 'elétrico',
      };
      itens.push({
        chave: 'projetos',
        grupo: 'Documentos',
        label: 'Projetos essenciais no cofre',
        status: statusDeContagem(presentes.length, PROJETOS_ESSENCIAIS.length),
        obrigatorio: false,
        detalhe:
          faltando.length === 0
            ? 'os 4 projetos anexados'
            : `falta: ${faltando.map((t) => rotulo[t]).join(', ')}`,
        acao: 'Anexe os projetos (arquitetônico, estrutural, hidráulico e elétrico) no Cofre de Documentos.',
        href: '/fiscal/documentos',
        telaLabel: 'Cofre de Documentos',
      });
    }

    // 8 · Marcos burocráticos / financeiro inicial (recomendado)
    {
      const temMarcos = e.marcos.length > 0;
      const temFinanceiro = e._count.transacoes > 0;
      const ok = (temMarcos ? 1 : 0) + (temFinanceiro ? 1 : 0);
      itens.push({
        chave: 'marcos-financeiro',
        grupo: 'Documentos',
        label: 'Marcos burocráticos e lançamentos iniciais',
        status: statusDeContagem(ok, 2),
        obrigatorio: false,
        detalhe: [
          temMarcos ? null : 'sem marcos (alvará/projeto Caixa)',
          temFinanceiro ? null : 'sem lançamentos financeiros',
        ]
          .filter(Boolean)
          .join('; ') || 'marcos e financeiro iniciados',
        acao: 'Registre os marcos (alvará, projeto Caixa) e os primeiros lançamentos (terreno, projetos).',
        href,
        telaLabel: 'Ficha do Empreendimento',
      });
    }

    const completos = itens.filter((i) => i.status === 'COMPLETO').length;
    const parciais = itens.filter((i) => i.status === 'PARCIAL').length;
    const pendentes = itens.filter((i) => i.status === 'PENDENTE').length;
    const faltamObrigatorios = itens.filter((i) => i.obrigatorio && i.status !== 'COMPLETO').length;

    return {
      id: e.id,
      nome,
      scorePct: calcularScore(itens),
      totalItens: itens.length,
      completos,
      parciais,
      pendentes,
      faltamObrigatorios,
      itens,
    };
  });

  // ── Cadastros base compartilhados (não pertencem a um empreendimento) ─────────
  const compartilhadosItens: ItemCompletude[] = [];
  {
    // Insumos com estoque mínimo configurado (alerta de reposição do MRP)
    const materiais = insumos.filter((i) => i.categoria === 'MATERIAL');
    const comMinimo = materiais.filter((i) => i.nivelMinimoEstoque != null).length;
    compartilhadosItens.push({
      chave: 'insumos-minimo',
      grupo: 'Cadastros base',
      label: 'Insumos com estoque mínimo configurado',
      status: materiais.length === 0 ? 'PENDENTE' : statusDeContagem(comMinimo, materiais.length),
      obrigatorio: false,
      detalhe:
        materiais.length === 0
          ? 'nenhum insumo de material cadastrado'
          : `${comMinimo} de ${materiais.length} materiais com mínimo`,
      acao: 'Defina o nível mínimo dos insumos para o alerta de reposição funcionar.',
      href: '/insumos',
      telaLabel: 'Insumos',
    });

    // Fornecedores cadastrados
    compartilhadosItens.push({
      chave: 'fornecedores',
      grupo: 'Cadastros base',
      label: 'Fornecedores cadastrados',
      status: fornecedoresAtivos > 0 ? 'COMPLETO' : 'PENDENTE',
      obrigatorio: false,
      detalhe: fornecedoresAtivos > 0 ? `${fornecedoresAtivos} fornecedor(es) ativo(s)` : 'nenhum fornecedor cadastrado',
      acao: 'Cadastre fornecedores para cotações e ordens de compra.',
      href: '/fornecedores',
      telaLabel: 'Fornecedores',
    });

    // Equipe (trabalhadores) cadastrada — base do SST
    compartilhadosItens.push({
      chave: 'trabalhadores',
      grupo: 'Cadastros base',
      label: 'Equipe cadastrada (trabalhadores)',
      status: trabalhadoresAtivos > 0 ? 'COMPLETO' : 'PENDENTE',
      obrigatorio: true,
      detalhe: trabalhadoresAtivos > 0 ? `${trabalhadoresAtivos} trabalhador(es) ativo(s)` : 'nenhum trabalhador cadastrado',
      acao: 'Cadastre a equipe da obra — base para ponto, ASO, EPI e liberação de medição.',
      href: '/trabalhadores',
      telaLabel: 'Trabalhadores',
    });

    // SST em dia (ASO/EPI não vencidos) — trava medição quando vencido
    const vencidos = sst.asosVencidos.length + sst.episVencidos.length;
    compartilhadosItens.push({
      chave: 'sst-em-dia',
      grupo: 'Cadastros base',
      label: 'Segurança em dia (ASO/EPI)',
      status: trabalhadoresAtivos === 0 ? 'PENDENTE' : vencidos > 0 ? 'PARCIAL' : 'COMPLETO',
      obrigatorio: false,
      detalhe:
        trabalhadoresAtivos === 0
          ? 'cadastre a equipe primeiro'
          : vencidos > 0
            ? `${sst.asosVencidos.length} ASO(s) e ${sst.episVencidos.length} EPI(s) vencidos`
            : 'ASO/EPI sem vencidos',
      acao: 'Mantenha ASO e EPI válidos — vencidos travam a liberação de medição.',
      href: '/trabalhadores',
      telaLabel: 'Trabalhadores',
    });
  }

  const compartilhados = {
    scorePct: calcularScore(compartilhadosItens),
    itens: compartilhadosItens,
  };

  // ── Resumo geral ──────────────────────────────────────────────────────────
  const scoreMedioPct =
    empreendimentos.length > 0
      ? Math.round(empreendimentos.reduce((a, e) => a + e.scorePct, 0) / empreendimentos.length)
      : 100;
  const faltamObrigatorios =
    empreendimentos.reduce((a, e) => a + e.faltamObrigatorios, 0) +
    compartilhadosItens.filter((i) => i.obrigatorio && i.status !== 'COMPLETO').length;

  return {
    resumo: {
      empreendimentos: empreendimentos.length,
      scoreMedioPct,
      faltamObrigatorios,
    },
    empreendimentos,
    compartilhados,
  };
}
