import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase, User } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: {
    name: string;
    phone: string;
    gender: string;
    address: string;
    user_type: string;
  }) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setSession(session);
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setUser(null);
        }
      })();
    });
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('Loading profile for userId:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      console.log('Profile data:', data, 'Error:', error);
      
      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }
      
      // If profile doesn't exist, create a minimal one from auth user data
      if (!data) {
        console.log('Profile not found, creating minimal profile...');
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser?.user) {
          const { error: insertError } = await supabase.from('users').insert({
            id: userId,
            email: authUser.user.email ?? '',
            name: authUser.user.email?.split('@')[0] ?? 'User',
            phone: '',
            gender: 'Other',
            address: '',
            user_type: 'resident',
            created_at: new Date().toISOString(),
          });
          
          if (insertError) {
            console.error('Failed to create profile:', insertError);
            throw insertError;
          }
          
          // Fetch the newly created profile
          const { data: newProfile, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (fetchError || !newProfile) {
            console.error('Failed to fetch new profile:', fetchError);
            throw fetchError || new Error('Profile creation succeeded but fetch failed');
          }
          
          setUser(newProfile);
        } else {
          throw new Error('Auth user not found');
        }
      } else {
        setUser(data);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('fetch') ||
    message.includes('NetworkError') ||
    message.includes('network') ||
    message.includes('Failed to fetch') ||
    (error instanceof TypeError && message.includes('fetch'))
  );
}

const signUp = async (
  email: string,
  password: string,
  userData: {
    name: string;
    phone: string;
    gender: string;
    address: string;
    user_type: string;
  }
) => {
  try {
    console.log('Signing up with email:', email);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    console.log('Auth response:', authData, 'Auth error:', authError);

    if (authError) return { error: authError };

    if (authData.user) {
      console.log('Inserting user profile:', { id: authData.user.id, email, ...userData });
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        email,
        ...userData,
        created_at: new Date().toISOString(), // Match schema
      });
      console.log('Profile insert error:', profileError);
      if (profileError) return { error: profileError };
    }

    return { error: null };
  } catch (error) {
    console.error('Signup error:', error);
    if (isNetworkError(error)) {
      return {
        error: new Error(
          'Cannot reach the server. Check your internet connection. If you\'re on web, ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in .env and add this app\'s URL (e.g. http://localhost:8081) in Supabase Dashboard → Authentication → URL Configuration.'
        ),
      };
    }
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
};

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };

      if (data.session?.user) {
        await loadUserProfile(data.session.user.id);
      }

      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      if (isNetworkError(error)) {
        return {
          error: new Error(
            'Cannot reach the server. Check your internet connection. If you\'re on web, ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in .env and add this app\'s URL (e.g. http://localhost:8081) in Supabase Dashboard → Authentication → URL Configuration.'
          ),
        };
      }
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
