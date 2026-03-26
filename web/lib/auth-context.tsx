"use client";
/**
 * Cal AI — Auth Context
 *
 * Stores the session token in localStorage.
 * Provides useAuth() hook for all pages.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { getSessionUser, signUp as doSignUp, signIn as doSignIn, signOut as doSignOut, AuthUser } from "@/lib/actions/auth";

/* ── Types ── */
interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
});

const TOKEN_KEY = "calai_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    setToken(stored);
    setHydrated(true);
  }, []);

  // Fetch session user reactively when token or hydration state changes
  useEffect(() => {
    if (!hydrated) return;

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    getSessionUser(token).then((res) => {
      setUser(res);
      setLoading(false);
    }).catch(() => {
      setUser(null);
      setLoading(false);
    });
  }, [hydrated, token]);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      let res: any;
      try {
        res = await doSignUp({ name, email, password });
      } catch (err) {
        throw err instanceof Error ? err : new Error("Sign up failed");
      }
      if (!res) throw new Error("Sign up failed — no response from server");
      if (res.error) throw new Error(res.error);
      const t = res.token!;
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      let res: any;
      try {
        res = await doSignIn({ email, password });
      } catch (err) {
        throw err instanceof Error ? err : new Error("Sign in failed");
      }
      if (!res) throw new Error("Sign in failed — no response from server");
      if (res.error) throw new Error(res.error);
      const t = res.token!;
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
    },
    []
  );

  const signOut = useCallback(async () => {
    if (token) {
      await doSignOut({ token }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  return (
    <AuthContext.Provider value={{ user: user, token, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Access auth state anywhere in the app */
export function useAuth() {
  return useContext(AuthContext);
}
