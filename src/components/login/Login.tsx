"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, ShoppingCart, LogIn } from "lucide-react";
import Link from "next/link";
import { useLogin } from "@/hooks/useLogin";

// 🔹 Importa o LoadingBar
import { LoadingBar, LoadingBarRef } from "@/components/ui/loading-bar";

const Login = () => {
  const {
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
  } = useLogin();

  // 🔹 Criar referência para a barra
  const loadingBarRef = useRef<LoadingBarRef>(null);

  // 🔹 Ativa/desativa a barra quando o estado mudar
  useEffect(() => {
    if (isSubmitting) {
      loadingBarRef.current?.start();
    } else {
      loadingBarRef.current?.finish();
    }
  }, [isSubmitting]);

  const cardColor = "#090909";

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      {/* Barra de carregamento no topo */}
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
              <p className="text-sm text-neutral-400">Bem-vindo de volta!</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-8 py-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-white">
                  E-mail
                </Label>
                <Input
                  id="identifier"
                  type="email"
                  placeholder="seu@email.com"
                  disabled={isSubmitting}
                  {...register("identifier", { required: "O e-mail é obrigatório" })}
                  style={{ backgroundColor: cardColor }}
                  className="border border-neutral-700 text-white placeholder:text-neutral-400 rounded-md px-3 h-12 cursor-text focus:outline-none focus:ring-0 focus:border-2 focus:border-[#2799fe]"
                />
                {errors.identifier && (
                  <p className="text-xs text-red-500">{errors.identifier.message}</p>
                )}
              </div>

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
                    {...register("password", {
                      required: "A senha é obrigatória",
                      minLength: { value: 6, message: "A senha deve ter pelo menos 6 caracteres" },
                    })}
                    style={{ backgroundColor: cardColor }}
                    className="border border-neutral-700 text-white placeholder:text-neutral-400 rounded-md px-3 h-12 cursor-text focus:outline-none focus:ring-0 focus:border-2 focus:border-[#2799fe]"
                    onKeyUp={(e) =>
                      setCapsLock(
                        (e as React.KeyboardEvent<HTMLInputElement>).getModifierState?.("CapsLock") ?? false
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {capsLock && <p className="text-xs text-yellow-500">Caps Lock ligado</p>}
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-neutral-400 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("remember")}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                  Lembrar de mim
                </label>

                <Link
                  href="/recuperar-senha"
                  className="text-sm text-[#2799fe] hover:underline cursor-pointer"
                >
                  Esqueci minha senha
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-lg px-3 h-12 py-2 text-white bg-gradient-to-r from-[#1780d4] via-[#2799fe] to-[#3ba9ff] hover:from-[#0f6bb7] hover:via-[#1780d4] hover:to-[#2799fe] transition-all duration-300 cursor-pointer"
                disabled={isSubmitting}
              >
                <LogIn className="w-4 h-4" />
                {isSubmitting ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full bg-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-3 text-white" style={{ backgroundColor: cardColor }}>
                  Ou acesse via
                </span>
              </div>
            </div>

            <div className="flex">
              <Button
                onClick={handleGoogleLogin}
                type="button"
                className="flex-1 flex items-center justify-center gap-2 bg-[#1a1a1a] text-white border border-neutral-700 rounded-md px-3 h-12 hover:bg-transparent hover:text-white transition-all duration-300 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18">
                  <path fill="#FFC107" d="M43.611 20.083h-1.683V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.64 6.14 29.084 4 24 4 12.954 4 4 12.954 4 24c0-.302.008-.601.023-.898l2.283-8.411z"/>
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.148 18.961 14 24 14c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.64 6.14 29.084 4 24 4 12.954 4 4 12.954 4 24c0-.302.008-.601.023-.898l2.283-8.411z"/>
                  <path fill="#4CAF50" d="M24 44c5.084 0 9.64-2.14 12.961-5.583l-5.962-5.033C29.937 35.846 27.059 37 24 37c-5.202 0-9.607-3.322-11.268-7.958l-6.5 5.008C9.437 39.563 16.158 44 24 44z"/>
                  <path fill="#1976D2" d="M43.611 20.083h-1.683V20H24v8h11.303c-.792 2.237-2.228 4.166-4.107 5.543l5.962 5.033C39.182 35.763 42 30.351 42 24c0-1.341-.138-2.651-.389-3.917z"/>
                </svg>
                <span>Google</span>
              </Button>
            </div>

            <div className="text-center pt-0">
              <p className="text-sm text-neutral-400">
                Ainda não tem cadastro?{" "}
                <Link href="/cadastro" className="text-[#2799fe] font-medium hover:underline cursor-pointer">
                  Crie uma conta
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
