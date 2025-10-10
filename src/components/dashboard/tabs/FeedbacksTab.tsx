"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/context/ProfileContext";
import { MessageSquare, ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { motion } from "framer-motion";

interface Feedback {
  id: number;
  nome: string;
  tipo: string;
  mensagem: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
}

export default function FeedbacksTab() {
  const { profile } = useProfile();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [novoFeedback, setNovoFeedback] = useState("");
  const [tipo, setTipo] = useState("sugestão");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("todas");
  const [votos, setVotos] = useState<Record<number, string>>({});

  useEffect(() => {
    carregarFeedbacks();

    const sub = supabase
      .channel("feedbacks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedbacks" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setFeedbacks((prev) => [payload.new as Feedback, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setFeedbacks((prev) =>
              prev.map((f) =>
                f.id === payload.new.id ? (payload.new as Feedback) : f
              )
            );
          } else if (payload.eventType === "DELETE") {
            setFeedbacks((prev) =>
              prev.filter((f) => f.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  async function carregarFeedbacks() {
    const { data, error } = await supabase
      .from("feedbacks")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setFeedbacks(data);
  }

  async function enviarFeedback() {
    if (!novoFeedback.trim()) return alert("Digite um feedback antes de enviar.");
    setLoading(true);
    const { error } = await supabase.from("feedbacks").insert([
      {
        user_id: profile?.id,
        nome: profile?.name || "Usuário",
        tipo,
        mensagem: novoFeedback.trim(),
      },
    ]);
    setLoading(false);
    if (error) alert("Erro ao enviar feedback: " + error.message);
    else {
      setNovoFeedback("");
      setTipo("sugestão");
    }
  }

  async function votar(feedbackId: number, voto: "up" | "down") {
    if (!profile?.id) return alert("Você precisa estar logado para votar.");
    const votoAtual = votos[feedbackId];
    if (votoAtual === voto) return;

    const { data: existente } = await supabase
      .from("feedback_votes")
      .select("*")
      .eq("feedback_id", feedbackId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (existente) {
      await supabase.from("feedback_votes").update({ voto }).eq("id", existente.id);
    } else {
      await supabase.from("feedback_votes").insert([
        { feedback_id: feedbackId, user_id: profile.id, voto },
      ]);
    }

    await supabase.rpc("update_feedback_votes", { feedback_id_param: feedbackId });
    setVotos((prev) => ({ ...prev, [feedbackId]: voto }));
  }

  const filtrados =
    filter === "todas" ? feedbacks : feedbacks.filter((f) => f.tipo === filter);

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <h3 className="text-[20px] font-normal">Feedbacks</h3>

      {/* Card principal */}
      <div className="bg-[#111111] border border-neutral-700 rounded-[20px] p-6 space-y-6">
        {/* Header do card */}
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="text-[16px] font-medium text-foreground">
              Central de Feedbacks
            </h3>
            <p className="text-[12px] text-muted-foreground mt-1">
              Envie ideias, reporte erros e vote nas sugestões da comunidade
            </p>
          </div>
        </div>

        {/* Envio de feedback */}
        <div className="space-y-4 ps-1">
          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="bg-[#1a1a1a] border border-neutral-700 rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none"
            >
              <option value="sugestão">Sugestão</option>
              <option value="erro">Erro</option>
              <option value="ideia">Ideia</option>
            </select>
            <input
              type="text"
              value={novoFeedback}
              onChange={(e) => setNovoFeedback(e.target.value)}
              placeholder="Digite seu feedback..."
              className="flex-1 bg-[#1a1a1a] border border-neutral-700 rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none"
            />
            <button
              onClick={enviarFeedback}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-[#2699fe] hover:bg-[#2699fe]/90 px-4 py-2 rounded-md text-sm font-medium transition"
            >
              <Send className="w-4 h-4" />
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>

        {/* Filtro */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Filtro</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-neutral-700 rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none"
          >
            <option value="todas">Todas</option>
            <option value="sugestão">Sugestões</option>
            <option value="erro">Erros</option>
            <option value="ideia">Ideias</option>
          </select>
        </div>

        {/* Lista de feedbacks */}
        <div className="space-y-4">
          {filtrados.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum feedback encontrado.
            </p>
          ) : (
            filtrados.map((f) => (
              <motion.div
                key={f.id}
                className="bg-[#1a1a1a] border border-neutral-700 rounded-lg p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[14px] font-medium">{f.nome}</h4>
                  <span
                    className={`text-xs px-2 py-1 rounded-md capitalize ${
                      f.tipo === "erro"
                        ? "bg-red-100 text-red-700"
                        : f.tipo === "ideia"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {f.tipo}
                  </span>
                </div>

                <p className="text-[13px] text-gray-300 mb-3">{f.mensagem}</p>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {new Date(f.created_at).toLocaleString("pt-BR")}
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => votar(f.id, "up")}
                      className={`flex items-center gap-1 transition ${
                        votos[f.id] === "up"
                          ? "text-[#2699fe]"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-xs">{f.upvotes}</span>
                    </button>

                    <button
                      onClick={() => votar(f.id, "down")}
                      className={`flex items-center gap-1 transition ${
                        votos[f.id] === "down"
                          ? "text-red-500"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      <span className="text-xs">{f.downvotes}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
