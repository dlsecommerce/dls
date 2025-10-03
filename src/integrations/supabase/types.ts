// types/supabase.ts

// JSON genérico usado pelo Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// =============================
// Definição do Database
// =============================
export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      // --- PERFIS ---
      profiles: {
        Row: {
          id: string // uuid tratado como string
          name: string | null
          avatar_url: string | null
          status: "online" | "away" | "offline" | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name?: string | null
          avatar_url?: string | null
          status?: "online" | "away" | "offline" | null
          updated_at?: string | null
        }
        Update: Partial<{
          name: string | null
          avatar_url: string | null
          status: "online" | "away" | "offline" | null
          updated_at: string | null
        }>
      }

      // --- ANÚNCIOS ---
      anuncios_sb: {
        Row: {
          id: number
          loja: string
          id_bling: string | null
          id_geral: number
          referencia: string | null
          id_tray: string | null
          id_var: string | null
          od: string | null
          nome: string | null
          marca: string | null
          categoria: string | null
          peso: number | null
          altura: number | null
          largura: number | null
          comprimento: number | null
          codigo_1: string | null
          quant_1: number | null
          codigo_2: string | null
          quant_2: number | null
          codigo_3: string | null
          quant_3: number | null
          codigo_4: string | null
          quant_4: number | null
          codigo_5: string | null
          quant_5: number | null
          codigo_6: string | null
          quant_6: number | null
          codigo_7: string | null
          quant_7: number | null
          codigo_8: string | null
          quant_8: number | null
          codigo_9: string | null
          quant_9: number | null
          codigo_10: string | null
          quant_10: number | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database["public"]["Tables"]["anuncios_sb"]["Row"],
          "id" | "id_geral" | "created_at" | "updated_at"
        >
        Update: Partial<Database["public"]["Tables"]["anuncios_sb"]["Row"]>
      }
    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      [_ in never]: never
    }

    Enums: {
      [_ in never]: never
    }

    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// =============================
// Helpers genéricos
// =============================
type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> =
  DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
        Row: infer R
      }
      ? R
      : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
      ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
        ? R
        : never
      : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> =
  DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
      }
      ? I
      : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
        ? I
        : never
      : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> =
  DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
      }
      ? U
      : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
        ? U
        : never
      : never

// =============================
// Aliases prontos para uso
// =============================
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"]
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"]

export type AnuncioRow = Database["public"]["Tables"]["anuncios_sb"]["Row"]
export type AnuncioInsert = Database["public"]["Tables"]["anuncios_sb"]["Insert"]
export type AnuncioUpdate = Database["public"]["Tables"]["anuncios_sb"]["Update"]

// Constantes opcionais
export const Constants = {
  public: {
    Enums: {},
  },
} as const
