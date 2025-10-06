import React, { useState, useEffect } from "react";
import { Custo } from "@/entities/Custo";
import { Produto } from "@/entities/Produto";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Search,
  Plus,
  Download,
  Upload,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedMetricCard from "@/components/dashboard/AnimatedMetricCard";

export default function TabelaCustos() {
  const [custos, setCustos] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [custosData, produtosData] = await Promise.all([
        Custo.list("-created_date"),
        Produto.list()
      ]);
      setCustos(custosData);
      setProdutos(produtosData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProduto = (produtoId: string) => {
    return produtos.find((p) => p.id === produtoId);
  };

  const custosFiltrados = custos.filter((c) => {
    const produto = getProduto(c.produto_id);
    return (
      c.codigo?.toLowerCase().includes(busca.toLowerCase()) ||
      c.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      produto?.marca?.toLowerCase().includes(busca.toLowerCase())
    );
  });

  const totalCustos = custos.reduce((sum, c) => sum + (c.custo_total || 0), 0);
  const mediaVariacao =
    custos.reduce((sum, c) => sum + (c.variacao_percentual || 0), 0) /
    (custos.length || 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-4 md:p-8">
      {/* Background animado */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#f59e0b] rounded-full blur-[120px] opacity-10"
          animate={{
            scale: [1, 1.3, 1],
            y: [0, 50, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Título e descrição */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "120px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="h-1 bg-gradient-to-r from-[#f59e0b] to-transparent rounded-full mb-4"
          />
          <h1 className="text-5xl font-bold text-white mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Tabela de Custos
          </h1>
          <p className="text-gray-400 text-lg">
            Gerencie e monitore todos os custos dos produtos
          </p>
        </motion.div>

        {/* Cards métricas */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <AnimatedMetricCard
            title="Total de Custos"
            value={`R$ ${totalCustos.toFixed(2)}`}
            subtitle={`${custos.length} itens cadastrados`}
            icon={DollarSign}
            color="#f59e0b"
            delay={0}
          />
          <AnimatedMetricCard
            title="Variação Média"
            value={`${mediaVariacao.toFixed(1)}%`}
            subtitle="Comparado ao período anterior"
            icon={mediaVariacao >= 0 ? TrendingUp : TrendingDown}
            trend={{
              positive: mediaVariacao >= 0,
              value: `${Math.abs(mediaVariacao).toFixed(1)}%`
            }}
            color={mediaVariacao >= 0 ? "#10b981" : "#ef4444"}
            delay={0.1}
          />
          <AnimatedMetricCard
            title="Custo Médio"
            value={`R$ ${(totalCustos / (custos.length || 1)).toFixed(2)}`}
            subtitle="Por item de custo"
            icon={DollarSign}
            color="#8b5cf6"
            delay={0.2}
          />
        </div>

        {/* Tabela */}
        <GlassmorphicCard>
          <div className="p-6 border-b border-white/10">
            <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
              {/* Campo de busca */}
              <motion.div
                className="relative flex-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Buscar por código, descrição ou marca..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-12 bg-white/5 border-white/10 text-white h-12 rounded-xl hover:bg-white/10 transition-all duration-300"
                />
              </motion.div>

              {/* Botões de ação */}
              <motion.div
                className="flex gap-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Button
                  variant="outline"
                  className="border-white/10 text-white hover:bg-white/5 hover:border-[#f59e0b]/50 transition-all duration-300 rounded-xl"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
                <Button
                  variant="outline"
                  className="border-white/10 text-white hover:bg-white/5 hover:border-[#f59e0b]/50 transition-all duration-300 rounded-xl"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                </Button>
                <Button
                  variant="outline"
                  className="border-white/10 text-white hover:bg-white/5 hover:border-[#f59e0b]/50 transition-all duration-300 rounded-xl"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
                <Button className="bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:from-[#d97706] hover:to-[#f59e0b] rounded-xl shadow-lg hover:shadow-[#f59e0b]/50 transition-all duration-300">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Custo
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Tabela de custos */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="text-gray-400 font-semibold">
                    Código
                  </TableHead>
                  <TableHead className="text-gray-400 font-semibold">
                    Descrição
                  </TableHead>
                  <TableHead className="text-gray-400 font-semibold">
                    Marca
                  </TableHead>
                  <TableHead className="text-gray-400 font-semibold">
                    Quantidade
                  </TableHead>
                  <TableHead className="text-gray-400 font-semibold">
                    Custo Unit.
                  </TableHead>
                  <TableHead className="text-gray-400 font-semibold">
                    Custo Total
                  </TableHead>
                  <TableHead className="text-gray-400 font-semibold">
                    Variação
                  </TableHead>
                  <TableHead className="text-gray-400 font-semibold">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {custosFiltrados.map((custo, idx) => {
                    const produto = getProduto(custo.produto_id);
                    return (
                      <motion.tr
                        key={custo.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-white/10 hover:bg-white/5 transition-all duration-300 group"
                      >
                        <TableCell className="font-medium text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#f59e0b] opacity-0 group-hover:opacity-100 transition-opacity" />
                            {custo.codigo}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {custo.descricao}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-white/20 text-gray-300"
                          >
                            {produto?.marca || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {custo.quantidade}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          R$ {custo.custo_unitario?.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-semibold text-white">
                          R$ {custo.custo_total?.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {custo.variacao_percentual !== undefined && (
                            <motion.div
                              className={`flex items-center gap-1 font-medium ${
                                custo.variacao_percentual >= 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{
                                delay: idx * 0.05 + 0.2,
                                type: "spring"
                              }}
                            >
                              {custo.variacao_percentual >= 0 ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              {Math.abs(
                                custo.variacao_percentual
                              ).toFixed(1)}
                              %
                            </motion.div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
                          >
                            Editar
                          </Button>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </GlassmorphicCard>
      </div>
    </div>
  );
}
