const w = globalThis as any;

function normalizeBase(url: string): string {
  return (url || '').replace(/\/+$/, '');
}

function detectBackendBaseUrl(): string {
  const fromWindow = w.__NEXUS_BACKEND_URL__;
  if (fromWindow) return normalizeBase(String(fromWindow));

  const fromMeta = w?.import?.meta?.env?.NG_APP_BACKEND_URL;
  if (fromMeta) return normalizeBase(String(fromMeta));

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8080';
  }

  if (typeof window !== 'undefined') {
    return normalizeBase(window.location.origin);
  }

  return 'http://localhost:8080';
}

export const BACKEND_BASE_URL = detectBackendBaseUrl();
export const API_BASE_URL = `${BACKEND_BASE_URL}/api/v1`;
export const AUTH_BASE_URL = `${BACKEND_BASE_URL}/auth`;

export function toBackendUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${BACKEND_BASE_URL}${path}`;
  return `${BACKEND_BASE_URL}/${path}`;
}

export function wsBackendUrl(pathAndQuery: string): string {
  const protocol = BACKEND_BASE_URL.startsWith('https://') ? 'wss' : 'ws';
  const host = BACKEND_BASE_URL.replace(/^https?:\/\//, '');
  return `${protocol}://${host}${pathAndQuery}`;
}

