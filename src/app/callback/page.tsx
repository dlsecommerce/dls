"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { LoadingBar, type LoadingBarRef } from "@/components/ui/loading-bar";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function Callback() {
  const router = useRouter();
  const loadingBarRef = useRef<LoadingBarRef>(null);
  const [fade, setFade] = useState<"in" | "out">("in");
  const [message, setMessage] = useState("Entrando com o Google...");

  useEffect(() => {
    const handleAuth = async () => {
      try {
        loadingBarRef.current?.start();

        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error("❌ Erro Supabase:", error.message);
          setMessage("Erro ao autenticar, retornando...");
          await new Promise((r) => setTimeout(r, 600));
          router.replace("/inicio");
          return;
        }

        const session = data?.session;
        if (!session) {
          setMessage("Sessão não encontrada, retornando...");
          await new Promise((r) => setTimeout(r, 600));
          router.replace("/inicio");
          return;
        }

        const user = session.user;
        const createdAt = new Date(user.created_at).getTime();
        const updatedAt = new Date(user.updated_at).getTime();
        const isNewUser = Math.abs(updatedAt - createdAt) < 5000;

        // Finaliza o loading e inicia fade-out
        loadingBarRef.current?.finish();
        setFade("out");

        // Aguarda a animação terminar
        setTimeout(() => {
          if (isNewUser) {
            console.log("🆕 Novo usuário → /inicio");
            router.replace("/inicio");
          } else {
            console.log("🔁 Usuário existente → /dashboard");
            router.replace("/dashboard");
          }
        }, 400);
      } catch (err) {
        console.error("⚠️ Erro inesperado:", err);
        setMessage("Erro inesperado, retornando...");
        setTimeout(() => router.replace("/inicio"), 600);
      }
    };

    handleAuth();
  }, [router]);

  return (
    <AnimatePresence mode="wait">
      {fade === "in" && (
        <motion.div
          key="callback-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="flex flex-col items-center justify-center h-screen bg-background text-foreground"
        >
          {/* 🔹 Logo central */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center gap-6"
          >
            <Image
              src="/logo.svg" // coloque seu logo aqui
              alt="Logo"
              width={120}
              height={120}
              className="animate-pulse"
              priority
            />

            <LoadingBar ref={loadingBarRef} />

            <motion.p
              className="text-sm text-gray-500 mt-4"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              {message}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
