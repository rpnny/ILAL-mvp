/**
 * Auth utility functions
 */

const TOKEN_KEY = 'ilal_access_token';
const REFRESH_TOKEN_KEY = 'ilal_refresh_token';
const USER_KEY = 'ilal_user';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

function migrateLegacyLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const legacy = window.localStorage.getItem(key);
  if (!legacy) return null;
  window.sessionStorage.setItem(key, legacy);
  window.localStorage.removeItem(key);
  return legacy;
}

export function setTokens(accessToken: string, refreshToken: string) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(TOKEN_KEY, accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getAccessToken(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  return storage.getItem(TOKEN_KEY) ?? migrateLegacyLocalStorage(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  return storage.getItem(REFRESH_TOKEN_KEY) ?? migrateLegacyLocalStorage(REFRESH_TOKEN_KEY);
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function setUser(user: any) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): any | null {
  const storage = getStorage();
  if (!storage) return null;
  const userStr = storage.getItem(USER_KEY) ?? migrateLegacyLocalStorage(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
