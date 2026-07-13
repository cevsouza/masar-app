import { db } from '@/lib/db';
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
export async function salvarCelula(role: any, modulo: string, permitido: boolean) {
  return db.permissaoPapelModulo.upsert({
    where: { role_modulo: { role, modulo } },
    create: { role, modulo, permitido },
    update: { permitido },
  });
}
