"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingBar, type LoadingBarRef } from "@/components/ui/loading-bar"; 

const Callback = () => {
  const loadingBarRef = useRef<LoadingBarRef>(null);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        loadingBarRef.current?.start(); // inicia barra

        // Troca o código pelo token/sessão
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (data?.session) {
          window.opener?.postMessage(
            { type: "OAUTH_SUCCESS" },
            window.location.origin
          );
        } else {
          window.opener?.postMessage(
            { type: "OAUTH_ERROR", error: error?.message },
            window.location.origin
          );
        }
      } catch (err: unknown) {
        let message = "Erro desconhecido";
        if (err instanceof Error) {
          message = err.message;
        }
        window.opener?.postMessage(
          { type: "OAUTH_ERROR", error: message },
          window.location.origin
        );
      } finally {
        loadingBarRef.current?.finish(); // finaliza barra
        setTimeout(() => window.close(), 600); // fecha após barra terminar
      }
    };

    handleAuth();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      {/* ✅ só a barra de carregamento */}
      <LoadingBar ref={loadingBarRef} />
    </div>
  );
};

export default Callback;
