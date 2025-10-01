import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types"; // só se você tiver gerado o types

const SUPABASE_URL = "https://frvntdmlmzyfogazgdiy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydm50ZG1sbXp5Zm9nYXpnZGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTIyMzQsImV4cCI6MjA3MzE2ODIzNH0.A2lHp34RpsrIIXJ3WWyKBZLtKXgPUaM-j3nXl8fzCcs";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
