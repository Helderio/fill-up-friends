export type ApiUser = {
  id: string;
  email: string;
  displayName: string | null;
  points: number;
  roles: string[];
};

type StoredSession = {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
};

const SESSION_KEY = "liga_ao_session";
const AUTH_EVENT = "liga-ao-auth-change";

function readSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function writeSession(session: StoredSession | null) {
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

export function getAccessToken() {
  return readSession()?.accessToken ?? null;
}

export function getRefreshToken() {
  return readSession()?.refreshToken ?? null;
}

export function getStoredUser() {
  return readSession()?.user ?? null;
}

export function setAuthSession(session: StoredSession) {
  writeSession(session);
}

export function clearAuthSession() {
  writeSession(null);
}

export function onAuthChange(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AUTH_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
