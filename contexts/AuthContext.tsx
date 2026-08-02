import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Language, Profile } from '@/types/database';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  refreshProfile: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  signOut: () => Promise<void>;
  demoSignIn: (username?: string, language?: Language) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_USER_ID = 'demo-user-00000000-0000-0000-0000-000000000000';

function createDemoSession(): Session {
  const now = Math.floor(Date.now() / 1000);
  const user: User = {
    id: DEMO_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'demo@vibe.app',
    app_metadata: { provider: 'demo' },
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
  };
  return {
    provider_token: null,
    provider_refresh_token: null,
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    token_type: 'bearer',
    expires_in: 86400,
    expires_at: now + 86400,
    user,
  };
}

function createDemoProfile(username: string, language: Language): Profile {
  return {
    id: DEMO_USER_ID,
    username,
    avatar_url: null,
    instagram_username: null,
    language,
    created_at: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    profile: null,
    loading: true,
  });

  async function loadProfile(sessionUserId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, instagram_username, language, created_at')
      .eq('id', sessionUserId)
      .maybeSingle();
    if (error) {
      return null;
    }
    return data as Profile | null;
  }

  async function refreshProfile() {
    if (state.session?.user.id === DEMO_USER_ID) return;
    setState((s) => ({ ...s, loading: true }));
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setState({ session: null, profile: null, loading: false });
      return;
    }
    const profile = await loadProfile(session.user.id);
    setState({ session, profile, loading: false });
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) {
        setState({ session: null, profile: null, loading: false });
        return;
      }
      const profile = await loadProfile(session.user.id);
      if (!mounted) return;
      setState({ session, profile, loading: false });
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'SIGNED_OUT' || !session) {
          if (mounted) setState({ session: null, profile: null, loading: false });
          return;
        }
        const profile = await loadProfile(session.user.id);
        if (!mounted) return;
        setState({ session, profile, loading: false });
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function setLanguage(lang: Language) {
    if (state.session?.user.id === DEMO_USER_ID) {
      setState((s) => (s.profile ? { ...s, profile: { ...s.profile, language: lang } } : s));
      return;
    }
    setState((s) => (s.profile ? { ...s, profile: { ...s.profile, language: lang } } : s));
    const { error } = await supabase
      .from('profiles')
      .update({ language: lang })
      .eq('id', state.session?.user.id);
    if (error) {
      setState((s) => (s.profile ? { ...s, profile: { ...s.profile, language: s.profile!.language } } : s));
    }
  }

  async function signOut() {
    if (state.session?.user.id === DEMO_USER_ID) {
      setState({ session: null, profile: null, loading: false });
      return;
    }
    await supabase.auth.signOut();
    setState({ session: null, profile: null, loading: false });
  }

  function demoSignIn(username?: string, language?: Language) {
    const session = createDemoSession();
    const profile = createDemoProfile(username || 'Convidado', language || 'pt-BR');
    setState({ session, profile, loading: false });
  }

  return (
    <AuthContext.Provider value={{ ...state, refreshProfile, setLanguage, signOut, demoSignIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
