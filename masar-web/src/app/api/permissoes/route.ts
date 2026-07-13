import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { MODULOS, PAPEIS_CONFIGURAVEIS, modulosPermitidos, TODOS_MODULOS } from '@/lib/permissoes';
import { carregarMatriz, salvarCelula } from '@/lib/permissoesDb';

export const dynamic = 'force-dynamic';

// GET: matriz efetiva Papel × Módulo (Fase 5.2). Só ADMIN.
export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado: apenas administradores' }, { status: 403 });
  }

  const matriz = await carregarMatriz();
  const papeis = PAPEIS_CONFIGURAVEIS.map((role) => {
    const permitidos = modulosPermitidos(role, matriz);
    const modulos: Record<string, boolean> = {};
    for (const chave of TODOS_MODULOS) modulos[chave] = permitidos.includes(chave);
    return { role, modulos };
  });

  return NextResponse.json({ modulos: MODULOS, papeis });
}

// PATCH: liga/desliga uma célula (role, modulo). Só ADMIN.
export async function PATCH(request: NextRequest) {
  const sessionToken = request.cookies.get('masar_session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado: apenas administradores' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { role, modulo, permitido } = body;

  if (!(PAPEIS_CONFIGURAVEIS as readonly string[]).includes(role)) {
    return NextResponse.json({ error: 'Papel inválido (ADMIN sempre tem tudo; papel desconhecido)' }, { status: 400 });
  }
  if (!TODOS_MODULOS.includes(modulo)) {
    return NextResponse.json({ error: 'Módulo inválido' }, { status: 400 });
  }
  if (typeof permitido !== 'boolean') {
    return NextResponse.json({ error: 'permitido deve ser booleano' }, { status: 400 });
  }

  await salvarCelula(role, modulo, permitido);
  return NextResponse.json({ ok: true, role, modulo, permitido });
}
