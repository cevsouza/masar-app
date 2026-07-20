import { writeFile, mkdir, readdir, unlink } from 'fs/promises';
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
/**
 * Logos das empresas — pasta SEPARADA das dos documentos.
 *
 * Por que fora do diretório do tenant: o logo é servido SEM login (aparece na
 * tela de entrada, no portal do comprador, na página pública de cotação). A
 * rota que o entrega é pública. Se os logos morassem junto dos documentos,
 * essa rota pública seria um caminho para ler o cofre alheio. Aqui ela só
 * enxerga `logos/`, e nada mais.
 *
 * Um logo por empresa: o nome é `<empresaId>.<ext>`, e gravar de novo apaga o
 * anterior (inclusive de outra extensão). Sem lixo acumulado, sem ambiguidade
 * de qual é o vigente.
 */
const EXTENSOES_LOGO = new Set(['png', 'jpg', 'jpeg', 'webp']);

function pastaLogos(): string {
  return join(diretorioBase(), 'logos');
}

/** Grava o logo e devolve a extensão gravada. Só a plataforma chama isto. */
export async function salvarLogoDaEmpresa(
  empresaId: string,
  conteudo: Buffer,
  extensaoBruta: string
): Promise<string> {
  const ext = extensaoBruta.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!EXTENSOES_LOGO.has(ext)) {
    throw new Error('Formato de imagem não suportado. Use PNG, JPG ou WebP.');
  }
  if (!/^[a-zA-Z0-9-]+$/.test(empresaId)) {
    throw new Error('Identificador de empresa inválido.');
  }

  const pasta = pastaLogos();
  if (!existsSync(pasta)) await mkdir(pasta, { recursive: true });

  // Apaga qualquer logo anterior desta empresa (qualquer extensão).
  await apagarLogoDaEmpresa(empresaId);

  const nome = `${empresaId}.${ext}`;
  await writeFile(join(pasta, nome), conteudo);
  return ext;
}

/** Caminho absoluto do logo da empresa, ou null se não houver. */
export function caminhoLogo(empresaId: string): { caminho: string; ext: string } | null {
  if (!/^[a-zA-Z0-9-]+$/.test(empresaId)) return null;
  const pasta = pastaLogos();
  if (!existsSync(pasta)) return null;
  for (const ext of EXTENSOES_LOGO) {
    const caminho = join(pasta, `${empresaId}.${ext}`);
    if (existsSync(caminho)) return { caminho, ext };
  }
  return null;
}

async function apagarLogoDaEmpresa(empresaId: string): Promise<void> {
  const pasta = pastaLogos();
  if (!existsSync(pasta)) return;
  try {
    const arquivos = await readdir(pasta);
    for (const a of arquivos) {
      if (a.startsWith(`${empresaId}.`)) await unlink(join(pasta, a)).catch(() => {});
    }
  } catch {
    // pasta some entre existsSync e readdir — nada a apagar.
  }
}

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
