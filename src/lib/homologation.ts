import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';

type Configuration =
  | { state: 'disabled' }
  | { state: 'invalid' }
  | { state: 'enabled'; user: string; password: string; accountId: string };

/** Local/other environments remain unchanged; Render production must be configured explicitly. */
function configuration(): Configuration {
  const mode = process.env.NOIVARA_HOMOLOGACAO;
  const user = process.env.NOIVARA_HOMOLOG_USUARIO;
  const password = process.env.NOIVARA_HOMOLOG_SENHA;
  const accountId = process.env.NOIVARA_HOMOLOG_CONTA_ID;
  if (!mode && !user && !password && !accountId) {
    return process.env.NODE_ENV === 'production' && process.env.RENDER === 'true'
      ? { state: 'invalid' } : { state: 'disabled' };
  }
  if (mode !== '1' || !user || !/^[A-Za-z0-9._-]{1,64}$/.test(user)
    || !password || !/^[\x21-\x7e]{32,128}$/.test(password)
    || !accountId || !/^[A-Za-z0-9_-]{1,128}$/.test(accountId)) return { state: 'invalid' };

  try {
    const origin = new URL(process.env.APP_URL ?? '');
    if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash
      || (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:')
      || (process.env.NODE_ENV !== 'production' && (origin.protocol !== 'http:'
        || !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)))) return { state: 'invalid' };
  } catch {
    return { state: 'invalid' };
  }
  return { state: 'enabled', user, password, accountId };
}

export function homologationDeclared(): boolean {
  return configuration().state !== 'disabled';
}

/** The same check can be used in Proxy and again at data/mutation boundaries. */
export function homologationAccess(authorization: string | null): 'disabled' | 'invalid' | 'denied' | 'allowed' {
  const config = configuration();
  if (config.state !== 'enabled') return config.state;
  if (!authorization || authorization.length > 512) return 'denied';
  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(authorization);
  if (!match) return 'denied';
  const expected = Buffer.from(`${config.user}:${config.password}`, 'utf8').toString('base64');
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(match[1]), digest(expected)) ? 'allowed' : 'denied';
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
