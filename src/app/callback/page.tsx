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
  const [message, setMessage] = useState("Conectando com o Google...");
  const [fade, setFade] = useState<"in" | "out">("in");

  useEffect(() => {
    const handleAuth = async () => {
      try {
        loadingBarRef.current?.start();
        setMessage("Validando sua conta...");

        // 🔹 Troca o código do Google por sessão diretamente
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);

        if (error || !data.session) {
          console.error("❌ Erro Supabase:", error?.message);
          setMessage("Erro na autenticação, retornando...");
          setTimeout(() => router.replace("/inicio"), 600);
          return;
        }

        // ✅ Sessão obtida instantaneamente
        loadingBarRef.current?.finish();
        setFade("out");

        // Detecta se é novo usuário (diferença de até 5 segundos)
        const createdAt = new Date(data.session.user.created_at).getTime();
        const updatedAt = new Date(data.session.user.updated_at).getTime();
        const isNewUser = Math.abs(updatedAt - createdAt) < 5000;

        // Pequeno delay apenas para a animação
        setTimeout(() => {
          router.replace(isNewUser ? "/inicio" : "/dashboard");
        }, 300);
      } catch (err) {
        console.error("⚠️ Erro inesperado:", err);
        setMessage("Erro inesperado...");
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
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center gap-6"
          >
            <Image
              src="/logo.svg"
              alt="Logo"
              width={120}
              height={120}
              priority
              className="animate-pulse"
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
