"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { resetPassword } from "@/services/authService";
import { LoadingBar, LoadingBarRef } from "@/components/ui/loading-bar";

const errorMessages: Record<string, string> = {
  "User not found": "Usuário não encontrado.",
  "Invalid login credentials": "Credenciais inválidas.",
  "Email not confirmed": "E-mail não confirmado.",
  "Password should be at least 6 characters":
    "A senha deve ter pelo menos 6 caracteres.",
};

const translateError = (msg: string) =>
  errorMessages[msg] || "Não foi possível enviar o e-mail. Tente novamente.";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const loadingBarRef = useRef<LoadingBarRef>(null);

  useEffect(() => {
    if (isLoading) {
      loadingBarRef.current?.start();
    } else {
      loadingBarRef.current?.finish();
    }
  }, [isLoading]);

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      const { error } = await resetPassword(values.email);

      if (error) {
        toast.error(translateError(error.message));
      } else {
        setEmailSent(true);
        toast.success("📧 Email de recuperação enviado com sucesso!");
      }
    } catch {
      toast.error("Erro ao enviar email. Tente novamente.");
    } finally {
      setIsLoading(false);
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
              <p className="text-sm text-neutral-400">Recuperar acesso</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-8 py-6">
            {emailSent ? (
              <div className="space-y-6 text-center">
                <CardTitle className="text-2xl text-white">
                  Email enviado!
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  Verifique sua caixa de entrada e clique no link para redefinir
                  sua senha.
                </CardDescription>

                <Button
                  onClick={() => setEmailSent(false)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg px-3 h-12 py-2 text-white 
                            bg-gradient-to-r from-[#1780d4] via-[#2799fe] to-[#3ba9ff] 
                            hover:from-[#0f6bb7] hover:via-[#1780d4] hover:to-[#2799fe] 
                            transition-all duration-300"
                  aria-label="Enviar novamente o e-mail"
                >
                  Enviar novamente
                </Button>
                <Button
                  onClick={() => router.push("/login")}
                  variant="ghost"
                  className="text-white font-medium hover:underline"
                  aria-label="Voltar ao login"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao login
                </Button>
              </div>
            ) : (
              <>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="seu@email.com"
                              disabled={isLoading}
                              {...field}
                              style={{ backgroundColor: cardColor }}
                              className="border border-neutral-700 text-white placeholder:text-neutral-500 rounded-md px-3 h-12 focus:border-[#2799fe]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-[#1780d4] via-[#2799fe] to-[#3ba9ff] text-white h-12"
                      disabled={isLoading}
                    >
                      {isLoading ? "Enviando..." : "Enviar link de recuperação"}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="text-[#2799fe] font-medium flex items-center justify-center gap-2 hover:underline"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao login
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
