function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não configurado. Defina a variável de ambiente JWT_SECRET antes de iniciar a aplicação.');
  }
  return secret;
}

// ── Hashing de senha ────────────────────────────────────────────────────────
// Formato novo (versionado): `pbkdf2$<iteracoes>$<saltB64url>$<hashB64url>`, com
// salt ALEATÓRIO por usuário e 600k iterações (recomendação OWASP p/ PBKDF2-SHA256).
// Hashes antigos (hex puro, salt estático compartilhado, 1000 iterações) continuam
// sendo verificados e são migrados para o formato forte no próximo login.

const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_HASH = 'SHA-256';
const DERIVED_KEY_BITS = 256;

// Parâmetros do esquema legado (inseguro) — mantidos SÓ para verificar/migrar.
const LEGACY_SALT = 'masar_salt_12345_unique_key';
const LEGACY_ITERATIONS = 1000;

async function pbkdf2Derive(password: string, salt: Uint8Array, iterations: number): Promise<Buffer> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: PBKDF2_HASH },
    key,
    DERIVED_KEY_BITS
  );
  return Buffer.from(derivedBits);
}

// Comparação em tempo constante para não vazar informação por timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function legacyHashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const derived = await pbkdf2Derive(password, encoder.encode(LEGACY_SALT), LEGACY_ITERATIONS);
  return derived.toString('hex');
}

// Gera hash forte com salt aleatório por usuário, no formato versionado.
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await pbkdf2Derive(password, salt, PBKDF2_ITERATIONS);
  const saltStr = Buffer.from(salt).toString('base64url');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltStr}$${derived.toString('base64url')}`;
}

// Verifica a senha contra o hash armazenado — aceita o formato novo E o legado.
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const salt = new Uint8Array(Buffer.from(parts[2], 'base64url'));
    const derived = await pbkdf2Derive(password, salt, iterations);
    return timingSafeEqual(derived.toString('base64url'), parts[3]);
  }
  // Formato legado: hex puro com salt estático.
  const legacy = await legacyHashPassword(password);
  return timingSafeEqual(legacy, stored);
}

// Indica se o hash guardado deve ser regravado no formato forte (migração no login).
export function needsRehash(stored: string): boolean {
  if (!stored.startsWith('pbkdf2$')) return true;
  const parts = stored.split('$');
  return parts.length !== 4 || parseInt(parts[1], 10) < PBKDF2_ITERATIONS;
}

// Sign custom session JWT natively using HMAC-SHA256
export async function signSession(payload: any): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24 hours expiration
  const jwtPayload = { ...payload, exp: expiry };

  const encoder = new TextEncoder();
  
  // Base64URL encode utility
  const toBase64Url = (obj: any) => {
    const json = JSON.stringify(obj);
    return Buffer.from(json).toString('base64url');
  };

  const headerStr = toBase64Url(header);
  const payloadStr = toBase64Url(jwtPayload);
  const dataToSign = `${headerStr}.${payloadStr}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getJwtSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(dataToSign)
  );

  const signatureStr = Buffer.from(signature).toString('base64url');
  return `${dataToSign}.${signatureStr}`;
}

// Verify custom session JWT natively using HMAC-SHA256
export async function verifySession(token: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerStr, payloadStr, signatureStr] = parts;
    const dataToVerify = `${headerStr}.${payloadStr}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(getJwtSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signature = Buffer.from(signatureStr, 'base64url');
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(dataToVerify)
    );

    if (!isValid) return null;

    const payloadJson = Buffer.from(payloadStr, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Falha ao verificar sessão:', error);
    return null;
  }
}
