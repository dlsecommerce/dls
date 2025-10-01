"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingCart, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { updatePassword } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import Link from "next/link";
import { LoadingBar, LoadingBarRef } from "@/components/ui/loading-bar";

const schema = z
  .object({
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const loadingBarRef = useRef<LoadingBarRef>(null);

  useEffect(() => {
    if (isLoading) {
      loadingBarRef.current?.start();
    } else {
      loadingBarRef.current?.finish();
    }
  }, [isLoading]);

  useEffect(() => {
    let token = searchParams.get("access_token");
    let refreshToken = searchParams.get("refresh_token");

    if (!token && typeof window !== "undefined" && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      token = hashParams.get("access_token");
      refreshToken = hashParams.get("refresh_token");
    }

    async function exchangeToken() {
      if (!token || !refreshToken) {
        toast.error("Token inválido ou expirado.");
        router.push("/login");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: refreshToken,
      });

      if (error) {
        toast.error("Token inválido ou expirado.");
        router.push("/login");
        return;
      }

      setIsReady(true);
    }

    exchangeToken();
  }, [searchParams, router]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const { error } = await updatePassword(values.password);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Senha redefinida com sucesso! Faça login novamente.");
      router.push("/login");
    } catch {
      toast.error("Erro ao redefinir senha. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Carregando...
      </div>
    );
  }

  const cardColor = "#090909";

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <LoadingBar ref={loadingBarRef} />
      <div className="w-[500px] animate-enter relative z-10">
        <Card
          className="border border-neutral-700 rounded-2xl shadow-xl scale-90"
          style={{ backgroundColor: cardColor }}
        >
          <CardHeader>
            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r from-[#2799fe] to-[#1780d4] text-white shadow-lg">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Nova senha</h1>
              <CardDescription className="text-neutral-400">
                Digite sua nova senha abaixo
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-8 py-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Nova senha */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Nova senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Digite sua nova senha"
                            style={{ backgroundColor: "#121212" }}
                            className="pr-10 border border-neutral-700 text-white placeholder:text-neutral-500 h-12 cursor-text"
                            disabled={isLoading}
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Confirmar senha */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Confirmar senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirme sua nova senha"
                            style={{ backgroundColor: "#121212" }}
                            className="pr-10 border border-neutral-700 text-white placeholder:text-neutral-500 h-12 cursor-text"
                            disabled={isLoading}
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#1780d4] via-[#2799fe] to-[#3ba9ff] text-white h-12 cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? "Redefinindo..." : "Redefinir senha"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-[#2799fe] font-medium flex items-center justify-center gap-2 hover:underline transition-all duration-200 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
