import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../api/supabase';
import { fetchProfile } from '../api/auth';
import type { Profile } from '../types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, profile: null, loading: true });

  useEffect(() => {
    let active = true;
    const load = async (session: Session | null) => {
      const profile = session ? await fetchProfile(session.user.id).catch(() => null) : null;
      if (active) setState({ session, profile, loading: false });
    };
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Виклики Supabase всередині колбеку можуть заблокуватись — відкладаємо.
      setTimeout(() => load(session), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Для захищених екранів: гарантовано є користувач. */
export function useUser() {
  const { session, profile } = useContext(AuthContext);
  if (!session) throw new Error('useUser поза захищеним маршрутом');
  return { id: session.user.id, profile };
}
