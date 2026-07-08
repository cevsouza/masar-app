type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface LogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  traceId: string;
  context?: any;
  error?: {
    message: string;
    stack?: string;
  };
}

// Chaves que possuem dados confidenciais e devem ser ocultadas dos agregadores de log
const SENSITIVE_KEYS = ['password', 'senha', 'token', 'cpf', 'cnpj', 'secret', 'key', 'cvv', 'card', 'fgts', 'valorvenda'];

function maskData(data: any): any {
  if (!data) return data;
  if (typeof data !== 'object') return data;

  try {
    const cloned = JSON.parse(JSON.stringify(data));
    const traverse = (obj: any) => {
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          traverse(obj[key]);
        } else {
          const keyLower = key.toLowerCase();
          if (SENSITIVE_KEYS.some(sk => keyLower.includes(sk))) {
            obj[key] = '[MASCARADO]';
          }
        }
      }
    };
    traverse(cloned);
    return cloned;
  } catch {
    return '[DADO_ILEGIVEL_MASCARADO]';
  }
}

function generateTraceId(): string {
  return crypto.randomUUID();
}

function log(level: LogLevel, message: string, context?: any, err?: any) {
  const payload: LogPayload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    traceId: context?.traceId || generateTraceId(),
  };

  if (context) {
    // Clona e remove o traceId redundante antes de mascarar
    const { traceId, ...cleanContext } = context;
    if (Object.keys(cleanContext).length > 0) {
      payload.context = maskData(cleanContext);
    }
  }

  if (err) {
    payload.error = {
      message: err.message || String(err),
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    };
  }

  const jsonString = JSON.stringify(payload);
  if (level === 'ERROR') {
    console.error(jsonString);
  } else {
    console.log(jsonString);
  }
}

export const logger = {
  info: (message: string, context?: any) => log('INFO', message, context),
  warn: (message: string, context?: any) => log('WARN', message, context),
  error: (message: string, err?: any, context?: any) => log('ERROR', message, context, err),
};
