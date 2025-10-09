"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const loginSchema = z.object({
  identifier: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  remember: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function useLogin() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "", remember: false },
  });

  // 🔹 Login tradicional com email/senha
  const onSubmit = async (values: LoginFormValues) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.identifier,
        password: values.password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      // 🔸 Grava sessão localmente
      if (data.session) {
        await supabase.auth.setSession(data.session);
      }

      // 🔸 Espera o cookie ser persistido antes do redirect (importante no Edge)
      await new Promise((r) => setTimeout(r, 800));

      toast.success("Login realizado com sucesso!");
      router.replace("/dashboard");
    } catch (err) {
      console.error("Erro ao logar:", err);
      toast.error("Falha ao tentar entrar.");
    }
  };

  // 🔹 Login com Google (OAuth)
  const handleGoogleLogin = async () => {
    try {
      // ⚠️ IMPORTANTE: redireciona para o callback correto (Edge + cookies)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`, // ✅ obrigatório
          queryParams: { prompt: "select_account" },
        },
      });

      if (error) {
        console.error("Erro no login com Google:", error.message);
        toast.error(error.message);
      } else if (data?.url) {
        // 🔸 Redireciona manualmente (necessário em ambientes SSR/Edge)
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Erro no login Google:", err);
      toast.error("Erro ao conectar com o Google.");
    }
  };

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
    showPassword,
    setShowPassword,
    capsLock,
    setCapsLock,
    handleGoogleLogin,
  };
}
