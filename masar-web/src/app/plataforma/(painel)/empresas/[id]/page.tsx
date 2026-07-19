import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { adminPlataformaAtual } from '@/lib/plataforma';
import { runSemEscopoDeEmpresa, EMPRESA_RAIZ_ID } from '@/lib/tenant';
import FichaEmpresaForm, { type Ficha } from './FichaEmpresaForm';

export const dynamic = 'force-dynamic';

export default async function FichaEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // O layout também protege, mas layout e página renderizam em paralelo no
  // Next — sem esta checagem a página consultaria o banco com o redirect em
  // curso (mesma armadilha do cockpit).
  if (!(await adminPlataformaAtual())) redirect('/plataforma/login');

  const { id } = await params;
  const e = await runSemEscopoDeEmpresa(() => db.empresa.findUnique({ where: { id } }));
  if (!e) notFound();

  // O peso da instância decide qual regra de exclusão vale — a tela precisa
  // dizer isso antes do clique, não depois do erro.
  const [empreendimentos, casas, transacoes] = await runSemEscopoDeEmpresa(() =>
    Promise.all([
      db.empreendimento.count({ where: { empresaId: id } }),
      db.casa.count({ where: { empresaId: id } }),
      db.transacaoFinanceira.count({ where: { empresaId: id } }),
    ])
  );

  const inicial: Ficha = {
    empreendimentos,
    casas,
    transacoes,
    diasVencido: e.dataExpiracao
      ? Math.floor((Date.now() - e.dataExpiracao.getTime()) / 86_400_000)
      : null,
    id: e.id,
    nome: e.nome,
    slug: e.slug,
    cnpj: e.cnpj,
    ativa: e.ativa,
    dominio: e.dominio,
    logoUrl: e.logoUrl,
    corPrimaria: e.corPrimaria,
    corSecundaria: e.corSecundaria,
    emailRemetente: e.emailRemetente,
    plano: e.plano,
    limiteObras: e.limiteObras,
    dataExpiracao: e.dataExpiracao ? e.dataExpiracao.toISOString() : null,
    ehRaiz: e.id === EMPRESA_RAIZ_ID,
  };

  return <FichaEmpresaForm inicial={inicial} />;
}
