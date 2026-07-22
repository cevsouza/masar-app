import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * COBERTURA DE AUTENTICAÇÃO DAS ROTAS DE API.
 *
 * Este teste não exercita as rotas: ele LÊ o código-fonte de todas elas e cobra
 * que cada handler HTTP exportado verifique alguma credencial. Existe porque o
 * defeito que ele previne é de OMISSÃO, e omissão não aparece em teste de
 * comportamento — a rota esquecida funciona perfeitamente, só que para todo
 * mundo.
 *
 * A lista PUBLICAS abaixo é o único jeito de um handler ficar sem checagem, e
 * cada linha exige uma justificativa. O teste também reprova quando uma entrada
 * da lista deixa de existir ou passa a ter guarda: lista de exceção que ninguém
 * poda vira carimbo, e carimbo não protege nada.
 *
 * Rota nova sem guarda => este teste fica vermelho antes do deploy.
 */

const RAIZ = join(__dirname, '..', '..');
const BASE = join(RAIZ, 'src', 'app', 'api');

const METODOS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

/** Sinais de que ALGUMA credencial foi verificada. */
const MARCADORES: RegExp[] = [
  /verifySession\s*\(/,
  /exigirAcesso\s*\(/,
  /lerSessaoStaff\s*\(/,
  /exigirAdminPlataforma\s*\(/,
  /adminPlataformaAtual\s*\(/,
  /masar_client_session/,
  /isWebhookAuthorized\s*\(/,
  /CRON_SECRET/,
  /CLEAN_SECRET/,
  /SEED_SECRET/,
  /BOOTSTRAP_SECRET/,
  /PLATAFORMA_BOOTSTRAP_SECRET/,
  /tokenCotacao|tokenAcessoPortal/,
];

/**
 * Handlers deliberadamente sem checagem de credencial, com o porquê.
 * Chave: "MÉTODO /caminho".
 */
const PUBLICAS: Record<string, string> = {
  'POST /api/auth/login': 'É a porta de entrada: valida e-mail e senha, não sessão.',
  'POST /api/auth/logout': 'Só apaga o cookie. Exigir sessão para sair não protege nada.',
  'GET /api/auth/cliente/logout': 'Idem, para o portal do comprador.',
  'POST /api/auth/plataforma': 'Login do control plane: valida senha do admin de plataforma.',
  'DELETE /api/auth/plataforma': 'Logout do control plane.',
  'GET /api/health': 'Sonda de saúde do Railway — precisa responder sem credencial.',
  'GET /api/marca/logo/[empresaId]': 'Serve o logo na tela de LOGIN, antes de existir sessão.',
  'POST /api/suprimentos/cotacao':
    'Portal do fornecedor: quem posta não tem conta. A capacidade é o id da solicitação; ' +
    'a rota valida status, tipo e tamanho do anexo e tem teto de propostas.',
};

function listarRotas(dir: string): string[] {
  const out: string[] = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) out.push(...listarRotas(p));
    else if (nome === 'route.ts' || nome === 'route.tsx') out.push(p);
  }
  return out;
}

/**
 * Corpo de uma função a partir do índice da declaração.
 *
 * Não dá para pegar a primeira `{`: a assinatura tem desestruturação
 * (`{ params }`) e o retorno pode ser tipado com chaves (`: Promise<{...}>`).
 * Casamos os parênteses dos parâmetros e depois pegamos a primeira `{` com
 * profundidade ZERO de `<`.
 */
function corpoDaFuncao(src: string, idx: number): string {
  const abrePar = src.indexOf('(', idx);
  let abre = -1;

  if (abrePar === -1) {
    abre = src.indexOf('{', idx);
  } else {
    let par = 0;
    let fechaPar = -1;
    for (let i = abrePar; i < src.length; i++) {
      if (src[i] === '(') par++;
      else if (src[i] === ')' && --par === 0) {
        fechaPar = i;
        break;
      }
    }
    if (fechaPar === -1) {
      abre = src.indexOf('{', idx);
    } else {
      let ang = 0;
      for (let i = fechaPar + 1; i < src.length; i++) {
        const c = src[i];
        if (c === '<') ang++;
        else if (c === '>') ang = Math.max(0, ang - 1);
        else if (c === '{' && ang === 0) {
          abre = i;
          break;
        }
      }
    }
  }

  if (abre === -1) return '';
  let nivel = 0;
  for (let i = abre; i < src.length; i++) {
    if (src[i] === '{') nivel++;
    else if (src[i] === '}' && --nivel === 0) return src.slice(abre, i + 1);
  }
  return src.slice(abre);
}

function temMarcador(trecho: string): boolean {
  return MARCADORES.some((re) => re.test(trecho));
}

interface Handler {
  chave: string;
  protegido: boolean;
}

function analisar(): Handler[] {
  const handlers: Handler[] = [];

  for (const arquivo of listarRotas(BASE)) {
    const src = readFileSync(arquivo, 'utf8');
    const url =
      '/' +
      relative(join(RAIZ, 'src', 'app'), arquivo).split(sep).slice(0, -1).join('/');

    for (const metodo of METODOS) {
      const re = new RegExp(
        `export\\s+(?:async\\s+)?(?:function\\s+${metodo}\\b|const\\s+${metodo}\\s*=)`,
      );
      const m = re.exec(src);
      if (!m) continue;

      const corpo = corpoDaFuncao(src, m.index);
      let protegido = temMarcador(corpo);

      // O guarda pode estar num helper do próprio arquivo...
      if (!protegido) {
        for (const [, nome] of src.matchAll(/(?:async\s+)?function\s+(\w+)\s*\(/g)) {
          if ((METODOS as readonly string[]).includes(nome)) continue;
          if (!new RegExp(`\\b${nome}\\s*\\(`).test(corpo)) continue;
          const i = src.search(new RegExp(`(?:async\\s+)?function\\s+${nome}\\s*\\(`));
          if (i !== -1 && temMarcador(corpoDaFuncao(src, i))) {
            protegido = true;
            break;
          }
        }
      }

      // ...ou dentro de um helper importado de '@/lib', que é o padrão de
      // lib/cobranca: o guarda mora na função para nenhuma chamada nova escapar.
      if (!protegido) {
        for (const [, nomes, mod] of src.matchAll(
          /import\s*\{([^}]+)\}\s*from\s*'@\/lib\/([\w/.]+)'/g,
        )) {
          const usados = nomes
            .split(',')
            .map((n) => n.trim().split(/\s+as\s+/).pop()!.trim())
            .filter((n) => n && new RegExp(`\\b${n}\\s*\\(`).test(corpo));
          if (usados.length === 0) continue;

          let libSrc = '';
          for (const ext of ['.ts', '.tsx', '/index.ts']) {
            try {
              libSrc = readFileSync(join(RAIZ, 'src', 'lib', mod + ext), 'utf8');
              break;
            } catch {
              /* tenta a próxima extensão */
            }
          }
          if (!libSrc) continue;

          for (const fn of usados) {
            const i = libSrc.search(
              new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${fn}\\s*\\(`),
            );
            if (i !== -1 && temMarcador(corpoDaFuncao(libSrc, i))) {
              protegido = true;
              break;
            }
          }
          if (protegido) break;
        }
      }

      handlers.push({ chave: `${metodo} ${url}`, protegido });
    }
  }

  return handlers;
}

describe('cobertura de autenticação das rotas de API', () => {
  const handlers = analisar();

  it('encontra as rotas (guarda contra o teste virar no-op)', () => {
    expect(handlers.length).toBeGreaterThan(100);
  });

  it('todo handler verifica credencial, salvo os declarados públicos', () => {
    const desprotegidos = handlers
      .filter((h) => !h.protegido && !(h.chave in PUBLICAS))
      .map((h) => h.chave)
      .sort();

    expect(
      desprotegidos,
      `Handler(s) de API sem checagem de credencial. Use exigirAcesso() da lib/apiAuth ` +
        `ou declare em PUBLICAS com a justificativa:\n  ${desprotegidos.join('\n  ')}`,
    ).toEqual([]);
  });

  it('a lista de exceções não tem entrada morta', () => {
    const porChave = new Map(handlers.map((h) => [h.chave, h]));
    const mortas = Object.keys(PUBLICAS).filter((c) => !porChave.has(c));
    expect(mortas, `Entradas de PUBLICAS que não existem mais: ${mortas.join(', ')}`).toEqual([]);
  });

  it('a lista de exceções não guarda rota que já ficou protegida', () => {
    const porChave = new Map(handlers.map((h) => [h.chave, h]));
    const obsoletas = Object.keys(PUBLICAS).filter((c) => porChave.get(c)?.protegido);
    expect(
      obsoletas,
      `Rotas listadas como públicas mas que já checam credencial — remova de PUBLICAS: ${obsoletas.join(', ')}`,
    ).toEqual([]);
  });
});
