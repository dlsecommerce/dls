"use client";

import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Package,
  DollarSign,
  TrendingUp,
  Calendar,
  Filter,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import AnimatedMetricCard from "@/components/dashboard/AnimatedMetricCard";
import SalesChart from "@/components/dashboard/SalesChart";
import TopProductsWidget from "@/components/dashboard/TopProductsWidget";
import QuickActions from "@/components/dashboard/QuickActions";
import UltimosPedidosWidget from "@/components/dashboard/LastOrders";
import TaxaConversaoWidget from "@/components/dashboard/RateConversation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function DashboardClient() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [custos, setCustos] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [periodo, setPeriodo] = useState("30dias");
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filtroMarketplace, setFiltroMarketplace] = useState("todos");

  useEffect(() => {
    // aqui você carrega os dados (mockados ou de API)
    setProdutos([]);
    setCustos([]);
    setPedidos([]);
  }, []);

  const totalVendas = 25000;
  const totalAnuncios = 140;
  const margemMedia = 19.5;

  const handlePeriodoChange = (value: string) => {
    setPeriodo(value);
    setShowDatePicker(value === "custom");
  };

  const handleFiltroClick = () => {
    const next =
      filtroMarketplace === "todos"
        ? "mercado_livre"
        : filtroMarketplace === "mercado_livre"
        ? "shopee"
        : filtroMarketplace === "shopee"
        ? "loja_virtual"
        : "todos";
    setFiltroMarketplace(next);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho com filtros */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col md:flex-row md:items-center md:justify-end gap-4"
        >
          <Calendar className="w-5 h-5 text-gray-400" />
          <Select value={periodo} onValueChange={handlePeriodoChange}>
            <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white rounded-xl hover:bg-white/10 transition-all">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="7dias">Últimos 7 dias</SelectItem>
              <SelectItem value="30dias">Últimos 30 dias</SelectItem>
              <SelectItem value="90dias">Últimos 90 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleFiltroClick}
                className={`border-white/10 hover:bg-white/5 rounded-xl transition-all ${
                  filtroMarketplace !== "todos"
                    ? "bg-[#2699fe]/20 border-[#2699fe]/50"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Filter className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="bg-[#1a1a1a] border-white/10 w-64">
              <p className="text-sm font-semibold text-white mb-3">
                Filtrar por Marketplace
              </p>
              {["todos", "mercado_livre", "shopee", "loja_virtual"].map((v) => (
                <button
                  key={v}
                  onClick={() => setFiltroMarketplace(v)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                    filtroMarketplace === v
                      ? "bg-[#2699fe]/20 text-[#2699fe] border border-[#2699fe]/30"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {v.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </motion.div>

        {/* Cards principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <AnimatedMetricCard
            title="Total de Vendas"
            value={`R$ ${totalVendas.toFixed(2)}`}
            subtitle="Valor total em estoque"
            icon={ShoppingCart}
            trend={{ positive: true, value: "12.5%" }}
            color="#2699fe"
          />
          <AnimatedMetricCard
            title="Total de Anúncios"
            value={totalAnuncios}
            subtitle="Produtos cadastrados"
            icon={Package}
            trend={{ positive: true, value: "8.2%" }}
            color="#10b981"
          />
          <AnimatedMetricCard
            title="Margem Média"
            value={`${margemMedia.toFixed(1)}%`}
            subtitle="Lucro sobre vendas"
            icon={TrendingUp}
            trend={{ positive: true, value: "2.1%" }}
            color="#f59e0b"
          />
        </div>

        {/* Gráfico e widgets */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <SalesChart />
          </div>
          <QuickActions />
        </div>

        <div className="mb-8">
          <TaxaConversaoWidget />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <TopProductsWidget produtos={[]} />
          <UltimosPedidosWidget pedidos={[]} />
        </div>

        {/* Cards finais */}
        <div className="grid md:grid-cols-3 gap-6">
          <GlassmorphicCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Crescimento Mensal</h3>
              <ArrowUpRight className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white mb-2">+24.5%</p>
            <p className="text-sm text-gray-400">Comparado ao mês anterior</p>
          </GlassmorphicCard>

          <GlassmorphicCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Ticket Médio</h3>
              <DollarSign className="w-5 h-5 text-[#2699fe]" />
            </div>
            <p className="text-3xl font-bold text-white mb-2">R$ 156,80</p>
            <p className="text-sm text-gray-400">Por pedido realizado</p>
          </GlassmorphicCard>

          <GlassmorphicCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Estoque Total</h3>
              <Package className="w-5 h-5 text-[#8b5cf6]" />
            </div>
            <p className="text-3xl font-bold text-white mb-2">872</p>
            <p className="text-sm text-gray-400">Unidades disponíveis</p>
          </GlassmorphicCard>
        </div>
      </div>
    </div>
  );
}
