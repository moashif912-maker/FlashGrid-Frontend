import { createContext, useCallback, useContext, useMemo, useState } from "react";

const STORAGE_KEY = "flashgrid_userId";
const AuthContext = createContext(null);

function readStoredUserId() {
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(readStoredUserId);

  const login = useCallback((id) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      /* storage blocked, state still works for this session */
    }
    setUserId(id);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setUserId(null);
  }, []);

  const value = useMemo(
    () => ({ userId, isLoggedIn: userId !== null, login, logout }),
    [userId, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}