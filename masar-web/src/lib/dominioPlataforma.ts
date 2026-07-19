/**
 * Subdomínio por cliente sobre um domínio curinga (Modelo A).
 *
 * A ideia: um único curinga `*.dominio-base` registrado no Railway e apontado no
 * DNS UMA vez. Depois disso cada cliente novo ganha `slug.dominio-base` sem
 * nenhum trabalho de infraestrutura — e nasce já com a marca dele na tela de
 * login, que é onde o white label precisa aparecer.
 *
 * Por que não o domínio do próprio cliente por padrão: cada um consome um slot
 * de domínio no Railway (20 por serviço no plano Pro, 2 no Hobby) e depende do
 * TI da construtora criar um CNAME. Um curinga consome UM slot para sempre. O
 * domínio próprio continua possível — é o campo separado na ficha — mas como
 * opcional, não como pré-requisito do onboarding.
 *
 * A base vem de env porque o dia em que o produto tiver nome próprio (separado
 * de "masarempreendimentos"), trocar uma variável não pode virar caça a string
 * espalhada pelo código.
 */

export const DOMINIO_BASE =
  process.env.DOMINIO_BASE_PLATAFORMA?.trim().toLowerCase() || 'masarempreendimentos.com.br';

/**
 * Subdomínios que não podem virar cliente.
 *
 * `www` e o apex vão para a operação da própria Masar; os demais são nomes que
 * infraestrutura costuma reivindicar depois (e-mail, painel, API). Entregar
 * "mail.masarempreendimentos.com.br" a um cliente e precisar dele meses depois
 * significaria tirar o endereço de alguém que já o imprimiu em contrato.
 */
const RESERVADOS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'plataforma',
  'console',
  'mail',
  'smtp',
  'imap',
  'ftp',
  'ns1',
  'ns2',
  'cdn',
  'static',
  'assets',
  'staging',
  'teste',
  'test',
  'dev',
  'homolog',
  'status',
  'suporte',
  'ajuda',
  'blog',
  'site',
  'masar',
]);

/** `fulano` → `fulano.masarempreendimentos.com.br`. Vazio devolve vazio. */
export function hostDoSubdominio(sub: string): string {
  const s = normalizarSubdominio(sub);
  return s ? `${s}.${DOMINIO_BASE}` : '';
}

/**
 * `fulano.masarempreendimentos.com.br` → `fulano`.
 * Host que não pertence à base devolve null — é domínio próprio, outro campo.
 */
export function subdominioDoHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const h = host.trim().toLowerCase();
  const sufixo = `.${DOMINIO_BASE}`;
  if (!h.endsWith(sufixo)) return null;
  const sub = h.slice(0, -sufixo.length);
  // Curinga não aninha: `a.b.base` não é servido pelo certificado de `*.base`.
  return sub && !sub.includes('.') ? sub : null;
}

export function normalizarSubdominio(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** Devolve o motivo da recusa, ou null se o subdomínio serve. */
export function validarSubdominio(sub: string): string | null {
  const s = normalizarSubdominio(sub);
  if (!s) return 'Informe o subdomínio.';
  if (s.length < 3) return 'O subdomínio precisa de pelo menos 3 caracteres.';
  if (RESERVADOS.has(s)) return `"${s}" é um nome reservado da plataforma. Escolha outro.`;
  return null;
}

/** Sugestão a partir do slug da empresa; vazia se o slug cair em reservado. */
export function subdominioSugerido(slug: string): string {
  const s = normalizarSubdominio(slug);
  return validarSubdominio(s) ? '' : s;
}
