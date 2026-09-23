import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { isConfigured } from "./env";
import { getSupabase } from "./supabase";

interface SessionValue {
  configured: boolean;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  signUp: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [configured] = useState(isConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(configured);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    let mounted = true;
    getSupabase()
      .auth.getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) setAuthError(error.message);
        setSession(data.session);
        setLoading(false);
      });
    const { data: sub } = getSupabase().auth.onAuthStateChange(
      (_event, next) => {
        if (mounted) setSession(next);
      },
    );
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signUp({ email, password });
    return error ? error.message : null;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    return error ? error.message : null;
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ configured, session, loading, authError, signUp, signIn, signOut }),
    [configured, session, loading, authError, signUp, signIn, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider.");
  return ctx;
}
