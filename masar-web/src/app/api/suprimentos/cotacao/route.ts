import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runComEmpresa, runSemEscopoDeEmpresa } from '@/lib/tenant';
import { salvarArquivoDaEmpresa } from '@/lib/storage';
import { join } from 'path';
import { existsSync } from 'fs';
import { logMutation } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { exigirAcesso } from '@/lib/apiAuth';

export async function POST(request: NextRequest) {
  try {
    const traceId = crypto.randomUUID();

    // O parse do corpo tem um teto próprio do runtime (~10 MB), abaixo do qual
    // ele estoura ANTES de qualquer validação nossa — e devolvia 500 com
    // "Failed to parse body as FormData", que não diz nada a um fornecedor.
    // Aqui viramos isso num erro compreensível.
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Arquivo grande demais. Envie um anexo de até 8 MB.' },
        { status: 413 }
      );
    }
    
    // DUAS credenciais possíveis, uma para cada caller — e nenhuma proposta
    // entra sem uma delas:
    //
    //  `token`         → o fornecedor, pelo link que recebeu. Não tem conta.
    //  `solicitacaoId` → o lançamento manual do staff de suprimentos, que tem.
    //
    // Antes a rota aceitava só o id, e sem sessão: os dois caminhos entravam
    // pela mesma porta destrancada. Id e token são ambos UUID, igualmente
    // difíceis de adivinhar — o que muda é a superfície de VAZAMENTO. O id
    // circula no painel da construtora, em respostas de API e em log; o token
    // só existe no link mandado ao fornecedor. Quem tivesse visto um id em
    // qualquer uma dessas superfícies lançava preço em concorrência alheia.
    const token = (formData.get('token') as string) || null;
    const idInformado = (formData.get('solicitacaoId') as string) || null;
    let fornecedorNome = formData.get('fornecedorNome') as string;
    const fornecedorId = (formData.get('fornecedorId') as string) || null;
    const valorUnitarioStr = formData.get('valorUnitario') as string;
    const prazoEntregaDiasStr = formData.get('prazoEntregaDias') as string;
    const file = formData.get('file') as File;

    if ((!token && !idInformado) || !fornecedorNome || !valorUnitarioStr || !prazoEntregaDiasStr) {
      return NextResponse.json({ error: 'Informe o token do link (ou a solicitação, se for lançamento interno) mais fornecedorNome, valorUnitario e prazoEntregaDias.' }, { status: 400 });
    }

    const valorUnitario = parseFloat(valorUnitarioStr);
    const prazoEntregaDias = parseInt(prazoEntregaDiasStr, 10);

    if (isNaN(valorUnitario) || valorUnitario <= 0 || isNaN(prazoEntregaDias) || prazoEntregaDias < 0) {
      return NextResponse.json({ error: 'Valores numéricos inválidos.' }, { status: 400 });
    }

    let solicitacao: { id: string; empresaId: string; status: string } | null;

    if (token) {
      // Caminho do fornecedor: o token é a credencial E é o que identifica o
      // tenant — a busca roda sem escopo só para descobrir de qual empresa é a
      // cotação, e todo o resto roda dentro dela. Mesma credencial da página
      // `/cotacao/[token]`, para o formulário não aceitar nada que a página já
      // não tenha aceitado.
      solicitacao = await runSemEscopoDeEmpresa(() =>
        db.solicitacaoCompra.findUnique({
          where: { tokenCotacao: token },
          select: { id: true, empresaId: true, status: true },
        })
      );
      if (!solicitacao) {
        return NextResponse.json({ error: 'Link de cotação inválido ou expirado.' }, { status: 404 });
      }
    } else {
      // Caminho interno: exige sessão de suprimentos. A busca roda ESCOPADA de
      // propósito — quem está logado só enxerga solicitação da própria empresa,
      // então um id de outro tenant simplesmente não existe daqui.
      //
      // O escopo vem do `empresaId` da sessão que o guarda acabou de devolver, e
      // não do contexto ambiente resolvido por `cookies()`: além de dispensar
      // uma segunda leitura do mesmo cookie, é o que torna esta rota chamável
      // fora de uma requisição real — em teste, por exemplo.
      const auth = await exigirAcesso(request, { modulo: 'suprimentos' });
      if (!auth.ok) return auth.resposta;
      if (!auth.sessao.empresaId) {
        return NextResponse.json({ error: 'Sessão sem empresa. Entre de novo.' }, { status: 401 });
      }

      solicitacao = await runComEmpresa(auth.sessao.empresaId, () =>
        db.solicitacaoCompra.findUnique({
          where: { id: idInformado! },
          select: { id: true, empresaId: true, status: true },
        })
      );
      if (!solicitacao) {
        return NextResponse.json({ error: 'Solicitação de cotação não encontrada.' }, { status: 404 });
      }
    }

    const solicitacaoId = solicitacao.id;

    // A checagem de status existe TAMBÉM aqui, e não só na página: o endpoint
    // pode ser chamado direto, sem passar por tela nenhuma.
    if (!['PENDENTE', 'ABERTA', 'EM_COTACAO'].includes(solicitacao.status)) {
      return NextResponse.json(
        { error: 'Esta solicitação não está mais recebendo propostas.' },
        { status: 409 }
      );
    }

    // Anexo: validação NO SERVIDOR. O `accept` do formulário é só uma dica ao
    // navegador e cai com um curl. Sem isto, qualquer um de posse do link
    // gravava arquivo de qualquer tipo e tamanho no volume da construtora — o
    // MESMO volume do cofre GED. Enchê-lo impede novos documentos, e documento
    // faltando trava medição: um link vazado viraria congelamento de obra.
    // 8 MB, deliberadamente ABAIXO do teto de parse do runtime (~10 MB).
    // Se o limite ficasse em 10, esta checagem nunca rodaria — o corpo estouraria
    // antes — e a proteção real seria um detalhe interno do framework, que muda
    // de versão sem aviso. Com folga, quem recusa é o nosso código, com mensagem
    // própria e status correto.
    const TAMANHO_MAX = 8 * 1024 * 1024;
    const EXTENSOES_OK = ['pdf', 'png', 'jpg', 'jpeg'];
    if (file && file.size > 0) {
      if (file.size > TAMANHO_MAX) {
        return NextResponse.json(
          { error: 'Arquivo muito grande. O limite é 8 MB.' },
          { status: 413 }
        );
      }
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!EXTENSOES_OK.includes(ext)) {
        return NextResponse.json(
          { error: 'Formato não aceito. Envie PDF, PNG ou JPG.' },
          { status: 415 }
        );
      }
    }

    return await runComEmpresa(solicitacao.empresaId, async () => {
    // Teto de propostas por solicitação. O endereço é público e o envio não
    // exige conta: sem um limite, um script posta milhares de cotações, entope
    // a caixa de suprimentos e enche o banco. Vinte é folgado para um processo
    // real de compra e barra o abuso.
    const TETO_COTACOES = 20;
    const jaRecebidas = await db.cotacaoFornecedor.count({ where: { solicitacaoId } });
    if (jaRecebidas >= TETO_COTACOES) {
      logger.warn(`[Portal Fornecedor] Teto de cotações atingido na solicitação ${solicitacaoId}`, { traceId });
      return NextResponse.json(
        { error: 'Esta solicitação já atingiu o número máximo de propostas.' },
        { status: 429 }
      );
    }

    // Se veio um fornecedor cadastrado, o nome autoritativo vem do cadastro.
    if (fornecedorId) {
      const fornecedor = await db.fornecedor.findUnique({ where: { id: fornecedorId } });
      if (!fornecedor) {
        return NextResponse.json({ error: 'Fornecedor cadastrado não encontrado.' }, { status: 400 });
      }
      fornecedorNome = fornecedor.nome;
    }

    logger.info(`[Portal Fornecedor] Recebendo cotação de ${fornecedorNome} para solicitação ${solicitacaoId}`, { traceId });

    let comprovanteUrl: string | null = null;

    // 1. Gravar PDF fisicamente se fornecido
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      comprovanteUrl = await salvarArquivoDaEmpresa(buffer, file.name);
    }

    // 2. Gravar cotação no banco
    const cotacao = await db.$transaction(async (tx) => {
      const c = await tx.cotacaoFornecedor.create({
        data: {
          solicitacaoId,
          fornecedorNome,
          fornecedorId,
          valorUnitario,
          prazoEntregaDias,
          comprovanteUrl
        }
      });

      // Atualizar status da solicitação para EM_COTACAO
      await tx.solicitacaoCompra.update({
        where: { id: solicitacaoId },
        data: { status: 'EM_COTACAO' }
      });

      // Gravar na auditoria
      await logMutation({
        usuarioId: 'SUPPLIER_PORTAL',
        usuarioNome: `Fornecedor: ${fornecedorNome}`,
        acao: 'SUPPLIER_QUOTE_SUBMITTED',
        tabela: 'CotacaoFornecedor',
        registroId: c.id,
        valoresNovos: {
          solicitacaoId,
          valorUnitario,
          prazoEntregaDias
        }
      });

      return c;
    });

    logger.info(`[Portal Fornecedor] Cotação cadastrada com sucesso: ID ${cotacao.id}`, { traceId });

    return NextResponse.json({ success: true, message: 'Cotação enviada com sucesso!' });
    });
  } catch (error: any) {
    logger.error('[Portal Fornecedor] Erro ao submeter cotação', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
