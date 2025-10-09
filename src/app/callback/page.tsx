"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { LoadingBar, type LoadingBarRef } from "@/components/ui/loading-bar";
import { motion, AnimatePresence } from "framer-motion";

export default function Callback() {
  const router = useRouter();
  const loadingBarRef = useRef<LoadingBarRef>(null);
  const [fade, setFade] = useState<"in" | "out">("in");
  const [message, setMessage] = useState("Verificando conta...");

  useEffect(() => {
    const handleAuth = async () => {
      try {
        loadingBarRef.current?.start();
        setMessage("Autenticando com o Google...");

        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error("❌ Erro Supabase:", error.message);
          setMessage("Erro na autenticação, voltando...");
          await new Promise((r) => setTimeout(r, 500));
          router.replace("/inicio");
          return;
        }

        const session = data?.session;
        if (!session) {
          setMessage("Sessão não encontrada, redirecionando...");
          await new Promise((r) => setTimeout(r, 500));
          router.replace("/inicio");
          return;
        }

        const user = session.user;
        const createdAt = new Date(user.created_at).getTime();
        const updatedAt = new Date(user.updated_at).getTime();
        const isNewUser = Math.abs(updatedAt - createdAt) < 5000;

        loadingBarRef.current?.finish();
        setFade("out");

        // espera o fade-out antes de mudar a rota
        setTimeout(() => {
          if (isNewUser) {
            console.log("🆕 Novo usuário → /inicio");
            router.replace("/inicio");
          } else {
            console.log("🔁 Usuário existente → /dashboard");
            router.replace("/dashboard");
          }
        }, 350);
      } catch (err) {
        console.error("⚠️ Erro inesperado:", err);
        router.replace("/inicio");
      }
    };

    handleAuth();
  }, [router]);

  return (
    <AnimatePresence mode="wait">
      {fade === "in" && (
        <motion.div
          key="fadein"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="flex flex-col items-center justify-center h-screen gap-4 bg-background text-foreground"
        >
          <LoadingBar ref={loadingBarRef} />
          <motion.p
            className="text-sm text-gray-500"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            {message}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
