const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET não configurado. Defina a variável de ambiente JWT_SECRET antes de iniciar a aplicação.');
}

// Hash password natively using PBKDF2 and Web Crypto
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode("masar_salt_12345_unique_key");

  const key = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 1000,
      hash: "SHA-256"
    },
    key,
    256
  );

  return Buffer.from(derivedBits).toString('hex');
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
    encoder.encode(JWT_SECRET),
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
      encoder.encode(JWT_SECRET),
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
