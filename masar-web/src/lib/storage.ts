import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, isAbsolute, normalize } from 'path';
import { exigirEmpresaId } from '@/lib/tenant';

/**
 * Armazenamento de arquivos do cofre (GED) com separação por empresa.
 *
 * Antes tudo caía num diretório plano (`/app/uploads/<uuid>.pdf`) e o banco
 * guardava o caminho ABSOLUTO. Funcionava com um dono só; com vários clientes
 * no mesmo volume, os arquivos de todos convivem lado a lado — e basta uma
 * query crua (o $queryRaw não passa pela extensão de tenant) ou um restore de
 * backup para o isolamento sumir.
 *
 * Agora: `<base>/<empresaId>/<uuid>.<ext>`, e o banco guarda o caminho
 * RELATIVO. Além do isolamento, isso desacopla o registro do sistema de
 * arquivos — mover o volume ou trocar de host não invalida o que está gravado.
 */

export function diretorioBase(): string {
  return process.env.NODE_ENV === 'production'
    ? '/app/uploads'
    : join(process.cwd(), 'uploads');
}

/**
 * Grava o arquivo na pasta da empresa vigente e devolve o caminho RELATIVO
 * (é esse que vai para o banco).
 */
export async function salvarArquivoDaEmpresa(
  conteudo: Buffer,
  nomeOriginal: string
): Promise<string> {
  const empresaId = await exigirEmpresaId();
  const extensao = (nomeOriginal.split('.').pop() || 'pdf').replace(/[^a-zA-Z0-9]/g, '') || 'pdf';

  const pasta = join(diretorioBase(), empresaId);
  if (!existsSync(pasta)) {
    await mkdir(pasta, { recursive: true });
  }

  const relativo = `${empresaId}/${crypto.randomUUID()}.${extensao}`;
  await writeFile(join(diretorioBase(), relativo), conteudo);
  return relativo;
}

/**
 * Converte o que está no banco em caminho absoluto para leitura.
 *
 * Aceita os registros ANTIGOS, que guardavam caminho absoluto — eles continuam
 * abrindo. E recusa qualquer coisa que tente escapar do diretório base
 * (`../../etc/passwd`), que passaria a ser possível agora que o caminho é
 * montado a partir de um valor do banco.
 */
export function caminhoAbsoluto(caminhoGravado: string): string {
  // Legado: já era absoluto, usa como está.
  if (isAbsolute(caminhoGravado) || /^[a-zA-Z]:[\\/]/.test(caminhoGravado)) {
    return caminhoGravado;
  }

  const base = diretorioBase();
  const resolvido = normalize(join(base, caminhoGravado));
  if (!resolvido.startsWith(normalize(base))) {
    throw new Error('Caminho de arquivo fora do diretório permitido');
  }
  return resolvido;
}
