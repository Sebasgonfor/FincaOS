'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { Perfil } from '@/types/database';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPerfil(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPerfil(session.user.id);
      } else {
        setPerfil(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchPerfil(userId: string) {
    const { data } = await supabase
      .from('perfiles')
      .select('*, comunidad:comunidades(*)')
      .eq('id', userId)
      .maybeSingle();
    setPerfil(data as Perfil | null);
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { user, perfil, loading, signOut };
}
