import { db } from '@/lib/db';

interface AuditParams {
  usuarioId?: string | null;
  usuarioNome?: string | null;
  acao: string;
  tabela: string;
  registroId?: string | null;
  valoresAntigos?: any;
  valoresNovos?: any;
}

export async function logMutation(params: AuditParams) {
  try {
    await db.logAuditoria.create({
      data: {
        usuarioId: params.usuarioId || null,
        usuarioNome: params.usuarioNome || null,
        acao: params.acao,
        tabela: params.tabela,
        registroId: params.registroId || null,
        valoresAntigos: params.valoresAntigos ? JSON.parse(JSON.stringify(params.valoresAntigos)) : null,
        valoresNovos: params.valoresNovos ? JSON.parse(JSON.stringify(params.valoresNovos)) : null,
      }
    });
  } catch (error) {
    console.error('Falha ao registrar log de auditoria:', error);
  }
}
