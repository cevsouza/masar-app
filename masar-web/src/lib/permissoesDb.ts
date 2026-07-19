import { db } from '@/lib/db';
import { exigirEmpresaId } from '@/lib/tenant';
import { MatrizPermissao, modulosPermitidos } from '@/lib/permissoes';

/**
 * Acesso à matriz de permissão no banco (Fase 5.2) — parte NODE (usa Prisma).
 * Separada de lib/permissoes.ts para não puxar o Prisma pro edge/client.
 */

// Carrega a matriz efetiva Record<papel, Record<modulo, permitido>> do banco.
export async function carregarMatriz(): Promise<MatrizPermissao> {
  const linhas = await db.permissaoPapelModulo.findMany();
  const matriz: MatrizPermissao = {};
  for (const l of linhas) {
    if (!matriz[l.role]) matriz[l.role] = {};
    matriz[l.role][l.modulo] = l.permitido;
  }
  return matriz;
}

// Módulos que um usuário (por papel) pode acessar agora — usado no login p/ gravar
// no token e no /api/auth/me.
export async function computarModulosUsuario(role: string): Promise<string[]> {
  const matriz = await carregarMatriz();
  return modulosPermitidos(role, matriz);
}

// Grava (upsert) uma célula da matriz.
// A chave única passou a incluir empresaId (cada empresa tem a sua matriz), então
// aqui o id da empresa é explícito — upsert precisa da chave composta completa.
export async function salvarCelula(role: any, modulo: string, permitido: boolean) {
  const empresaId = await exigirEmpresaId();
  return db.permissaoPapelModulo.upsert({
    where: { empresaId_role_modulo: { empresaId, role, modulo } },
    create: { role, modulo, permitido },
    update: { permitido },
  });
}
