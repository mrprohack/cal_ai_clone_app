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
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/* ── Types ── */
interface AuthUser {
  _id: string;
  name: string;
  email: string;
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  avatarUrl?: string;
  weightKg?: number;
  heightCm?: number;
  ageYears?: number;
  gender?: string;
}

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
  const [hydrated, setHydrated] = useState(false);

  // Load token from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    setToken(stored);
    setHydrated(true);
  }, []);

  // Reactive query — returns null until hydrated or if no token
  const sessionUser = useQuery(
    api.auth.getSessionUser,
    hydrated && token ? { token } : "skip"
  );

  const loading = !hydrated || (token !== null && sessionUser === undefined);

  /* actions */
  const doSignUp = useAction(api.auth.signUp);
  const doSignIn = useAction(api.auth.signIn);
  const doSignOut = useAction(api.auth.signOut);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const { token: t } = await doSignUp({ name, email, password });
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
    },
    [doSignUp]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { token: t } = await doSignIn({ email, password });
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
    },
    [doSignIn]
  );

  const signOut = useCallback(async () => {
    if (token) {
      await doSignOut({ token }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, [doSignOut, token]);

  const user = sessionUser ?? null;

  return (
    <AuthContext.Provider value={{ user: user as AuthUser | null, token, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Access auth state anywhere in the app */
export function useAuth() {
  return useContext(AuthContext);
}
