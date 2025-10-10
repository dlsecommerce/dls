"use client";
import { createBrowserClient } from "@supabase/ssr";
import { createContext, useContext, useState, useEffect } from "react";
import type { Database } from "@/integrations/supabase/types";

const Context = createContext<any>(null);

export default function SupabaseProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: any;
}) {
  const [user, setUser] = useState(initialUser);
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  return <Context.Provider value={{ supabase, user }}>{children}</Context.Provider>;
}

export const useSupabase = () => useContext(Context);
