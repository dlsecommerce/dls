"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, ShoppingCart, LogIn } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { LoadingBar, LoadingBarRef } from "@/components/ui/loading-bar";

export default function Login() {
  const { login, loginWithGoogle, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const loadingBarRef = useRef<LoadingBarRef>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (loading) loadingBarRef.current?.start();
    else loadingBarRef.current?.finish();
  }, [loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    await login(email, password);
  }

  const cardColor = "#090909";

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-4">
      <LoadingBar ref={loadingBarRef} />

      <div className="relative z-10 w-full max-w-md sm:w-[500px]">
        <Card
          className="scale-100 rounded-2xl border border-neutral-700 shadow-xl sm:scale-90"
          style={{ backgroundColor: cardColor }}
        >
          <CardHeader className="space-y-2 px-5 pb-0 pt-6 text-center sm:px-6 sm:pt-6">
            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-[#2799fe] to-[#1780d4] text-white shadow-lg cursor-pointer sm:h-16 sm:w-16">
                <ShoppingCart className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                DLS Ecommerce
              </h1>

              <p className="text-sm text-neutral-400">Bem-vindo de volta!</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-5 py-5 sm:space-y-6 sm:px-8 sm:py-6">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* E-mail */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  style={{ backgroundColor: cardColor }}
                  className="h-12 rounded-md border border-neutral-700 px-3 text-white placeholder:text-neutral-400 focus:border-[#2799fe] focus:ring-0 focus:outline-none focus:shadow-none"
                />
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    style={{ backgroundColor: cardColor }}
                    className="h-12 rounded-md border border-neutral-700 px-3 pr-10 text-white placeholder:text-neutral-400 focus:border-[#2799fe] focus:ring-0 focus:outline-none focus:shadow-none"
                    onKeyUp={(e) =>
                      setCapsLock(
                        (e as React.KeyboardEvent<HTMLInputElement>).getModifierState?.(
                          "CapsLock"
                        ) ?? false
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-white" />
                    ) : (
                      <Eye className="h-4 w-4 text-white" />
                    )}
                  </button>
                </div>

                {capsLock && (
                  <p className="text-xs text-yellow-500">Caps Lock ligado</p>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-400">
                  <input
                    type="checkbox"
                    className="cursor-pointer rounded border-gray-300"
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
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#1780d4] via-[#2799fe] to-[#3ba9ff] px-3 py-2 text-white transition-all duration-300 cursor-pointer hover:from-[#0f6bb7] hover:via-[#1780d4] hover:to-[#2799fe] focus:outline-none focus:ring-0 focus:shadow-none"
                disabled={loading}
              >
                <LogIn className="h-4 w-4" />
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            {/* Separador */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="h-px flex-1 bg-neutral-700" />
              <span className="text-[11px] uppercase text-white sm:text-xs">
                Ou acesse via
              </span>
              <div className="h-px flex-1 bg-neutral-700" />
            </div>

            {/* Login com Google */}
            <div className="flex">
              <Button
                onClick={() => loginWithGoogle()}
                type="button"
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md border border-neutral-300 px-3 text-gray-900 transition-all duration-300 cursor-pointer bg-gradient-to-r from-[#f5f5f5] via-[#ffffff] to-[#f5f5f5] hover:from-[#e5e5e5] hover:via-[#f0f0f0] hover:to-[#e5e5e5] focus:outline-none focus:ring-0 focus:shadow-none"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  width="18"
                  height="18"
                >
                  <path
                    fill="#4285F4"
                    d="M24 9.5c3.5 0 6.7 1.2 9.2 3.7l6.1-6.1C35.6 3.4 30.2 1 24 1 14.6 1 6.5 6.8 3 15l7.1 5.5C11.6 14.2 17.3 9.5 24 9.5z"
                  />
                  <path
                    fill="#34A853"
                    d="M46.1 24.5c0-1.6-.2-3.2-.6-4.5H24v9h12.6c-.6 3-2.2 5.6-4.6 7.3l7.1 5.5c4.1-3.7 7-9.4 7-17.3z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.1 28.6c-.5-1.5-.8-3.1-.8-4.6s.3-3.2.8-4.6l-7.1-5.5C1.7 17 1 20.4 1 24s.7 7 2 10.1l7.1-5.5z"
                  />
                  <path
                    fill="#EA4335"
                    d="M24 47c6.2 0 11.5-2 15.3-5.5l-7.1-5.5c-2.1 1.4-4.8 2.2-8.2 2.2-6.7 0-12.4-4.7-14.5-11l-7.1 5.5C6.5 41.2 14.6 47 24 47z"
                  />
                </svg>
                <span>Google</span>
              </Button>
            </div>

            <div className="pt-0 text-center">
              <p className="text-sm text-neutral-400">
                Ainda não tem cadastro?{" "}
                <Link
                  href="/cadastro"
                  className="font-medium text-[#2799fe] hover:underline cursor-pointer"
                >
                  Crie uma conta
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}