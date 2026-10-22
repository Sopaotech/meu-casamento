import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';

type Configuration =
  | { state: 'disabled' }
  | { state: 'invalid' }
  | { state: 'enabled'; users: [string, string]; passwords: [string, string]; accountId: string };

type BasicAttempt =
  | { state: 'disabled' }
  | { state: 'invalid' }
  | { state: 'unknown' }
  | { state: 'known'; slot: 0 | 1; allowed: boolean };

/** Local/other environments remain unchanged; Render production must be configured explicitly. */
function configuration(): Configuration {
  const mode = process.env.NOIVARA_HOMOLOGACAO;
  const user = process.env.NOIVARA_HOMOLOG_USUARIO;
  const password = process.env.NOIVARA_HOMOLOG_SENHA;
  const user2 = process.env.NOIVARA_HOMOLOG_USUARIO_2;
  const password2 = process.env.NOIVARA_HOMOLOG_SENHA_2;
  const accountId = process.env.NOIVARA_HOMOLOG_CONTA_ID;
  if (!mode && !user && !password && !user2 && !password2 && !accountId) {
    return process.env.NODE_ENV === 'production' && process.env.RENDER === 'true'
      ? { state: 'invalid' } : { state: 'disabled' };
  }
  if (mode !== '1' || !user || !/^[a-f0-9]{32}(?![\s\S])/.test(user)
    || !user2 || !/^[a-f0-9]{32}(?![\s\S])/.test(user2) || user === user2
    || !password || !/^[\x21-\x7e]{32,128}(?![\s\S])/.test(password)
    || !password2 || !/^[\x21-\x7e]{32,128}(?![\s\S])/.test(password2) || password === password2
    || !accountId || !/^[A-Za-z0-9_-]{1,128}(?![\s\S])/.test(accountId)) return { state: 'invalid' };

  try {
    const origin = new URL(process.env.APP_URL ?? '');
    if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash
      || (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:')
      || (process.env.NODE_ENV !== 'production' && (origin.protocol !== 'http:'
        || !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)))) return { state: 'invalid' };
  } catch {
    return { state: 'invalid' };
  }
  return { state: 'enabled', users: [user, user2], passwords: [password, password2], accountId };
}

export function homologationDeclared(): boolean {
  return configuration().state !== 'disabled';
}

/** Select only a fixed slot, after matching a secret, high-entropy identifier. */
export function homologationBasicAttempt(authorization: string | null): BasicAttempt {
  const config = configuration();
  if (config.state !== 'enabled') return { state: config.state };
  if (!authorization || authorization.length > 512) return { state: 'unknown' };
  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(authorization);
  if (!match) return { state: 'unknown' };
  const decoded = Buffer.from(match[1], 'base64');
  if (decoded.toString('base64') !== match[1]) return { state: 'unknown' };
  const colon = decoded.indexOf(0x3a);
  if (colon < 0) return { state: 'unknown' };
  const user = decoded.subarray(0, colon).toString('utf8');
  const digest = (value: string) => createHash('sha256').update(value).digest();
  const userDigest = digest(user);
  const matches = config.users.map(candidate => timingSafeEqual(userDigest, digest(candidate)));
  const suppliedDigest = digest(match[1]);
  const passwordsMatch = config.users.map((candidate, index) => {
    const expected = Buffer.from(`${candidate}:${config.passwords[index]}`, 'utf8').toString('base64');
    return timingSafeEqual(suppliedDigest, digest(expected));
  });
  if (matches[0]) return { state: 'known', slot: 0, allowed: passwordsMatch[0] };
  if (matches[1]) return { state: 'known', slot: 1, allowed: passwordsMatch[1] };
  return { state: 'unknown' };
}

/** Reuse the exact same parser at the data and mutation boundaries. */
export function homologationAccess(authorization: string | null): 'disabled' | 'invalid' | 'denied' | 'allowed' {
  const attempt = homologationBasicAttempt(authorization);
  if (attempt.state === 'disabled' || attempt.state === 'invalid') return attempt.state;
  return attempt.state === 'known' && attempt.allowed ? 'allowed' : 'denied';
}

/** In demo mode only this immutable user ID may authenticate or own visible data. */
export function homologationAllowsOwner(ownerId: string): boolean {
  const config = configuration();
  return config.state === 'disabled' || (config.state === 'enabled' && config.accountId === ownerId);
}

export function isHomologationAccount(ownerId: string): boolean {
  const config = configuration();
  return config.state === 'enabled' && config.accountId === ownerId;
}
