"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Eye, EyeOff, LogIn } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { signUp } from "@/services/authService";
import { toast } from "sonner";
import { LoadingBar, LoadingBarRef } from "@/components/ui/loading-bar";

// 🔹 Schema com validação de senha + confirmação
const signupSchema = z
  .object({
    username: z
      .string()
      .min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Senhas não coincidem",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const loadingBarRef = useRef<LoadingBarRef>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // 🔹 Ativa barra de carregamento no topo
  useEffect(() => {
    if (isSubmitting) {
      loadingBarRef.current?.start();
    } else {
      loadingBarRef.current?.finish();
    }
  }, [isSubmitting]);

  const onSubmit = async (values: SignupFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await signUp(
        values.email,
        values.password,
        values.username
      );

      if (error) {
        toast.error(
          error.message.includes("already registered")
            ? "Este email já está cadastrado. Tente fazer login."
            : error.message
        );
        return;
      }

      toast.success("Conta criada com sucesso! Verifique seu email.");
      router.push("/login");
    } catch {
      toast.error("Erro ao criar conta. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardColor = "#090909";

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <LoadingBar ref={loadingBarRef} />

      <div className="w-[500px] animate-enter relative z-10">
        <Card
          className="border border-neutral-700 rounded-2xl shadow-xl scale-90"
          style={{ backgroundColor: cardColor }}
        >
          <CardHeader className="space-y-2 text-center pb-0">
            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r from-[#2799fe] to-[#1780d4] text-white shadow-lg">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                DLS Ecommerce
              </h1>
              <p className="text-sm text-neutral-400">Crie sua conta</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-8 py-6">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              {/* Nome de usuário */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">
                  Nome de usuário
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Seu nome de usuário"
                  disabled={isSubmitting}
                  {...register("username")}
                  style={{ backgroundColor: "#121212" }}
                  className="border border-neutral-700 text-white placeholder:text-neutral-500 rounded-md px-3 h-12 focus:border-[#2799fe]"
                />
                {errors.username && (
                  <p className="text-xs text-red-500">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  disabled={isSubmitting}
                  {...register("email")}
                  style={{ backgroundColor: "#121212" }}
                  className="border border-neutral-700 text-white placeholder:text-neutral-500 rounded-md px-3 h-12 focus:border-[#2799fe]"
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    disabled={isSubmitting}
                    {...register("password")}
                    style={{ backgroundColor: "#121212" }}
                    className="border border-neutral-700 text-white placeholder:text-neutral-500 rounded-md px-3 h-12 focus:border-[#2799fe]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-white" />
                    ) : (
                      <Eye className="h-4 w-4 text-white" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirmar Senha */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">
                  Confirmar senha
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme sua senha"
                    disabled={isSubmitting}
                    {...register("confirmPassword")}
                    style={{ backgroundColor: "#121212" }}
                    className="border border-neutral-700 text-white placeholder:text-neutral-500 rounded-md px-3 h-12 focus:border-[#2799fe]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-white" />
                    ) : (
                      <Eye className="h-4 w-4 text-white" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-lg px-3 h-12 py-2 text-white bg-gradient-to-r from-[#1780d4] via-[#2799fe] to-[#3ba9ff] hover:from-[#0f6bb7] hover:via-[#1780d4] hover:to-[#2799fe] transition-all duration-300"
                disabled={isSubmitting}
              >
                <LogIn className="w-4 h-4" />
                {isSubmitting ? "Criando conta..." : "Criar conta"}
              </Button>
            </form>

            <div className="text-center pt-0">
              <p className="text-sm text-neutral-400">
                Já tem uma conta?{" "}
                <Link
                  href="/login"
                  className="text-[#2799fe] font-medium hover:opacity-80 transition-opacity"
                >
                  Faça login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
