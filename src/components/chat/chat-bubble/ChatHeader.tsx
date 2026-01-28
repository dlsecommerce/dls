import React from "react";
import { motion } from "framer-motion";
import {
  Users,
  Minimize2,
  Maximize2,
  X,
  Search,
  Settings,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface ChatHeaderProps {
  selectedUserName?: string;
  onlineCount: number;

  showSearch: boolean;
  setShowSearch: React.Dispatch<React.SetStateAction<boolean>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;

  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;

  isFullscreen: boolean;
  setIsFullscreen: React.Dispatch<React.SetStateAction<boolean>>;

  isMinimized: boolean;
  setIsMinimized: React.Dispatch<React.SetStateAction<boolean>>;

  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function ChatHeader({
  selectedUserName,
  onlineCount,
  showSearch,
  setShowSearch,
  searchTerm,
  setSearchTerm,
  showSettings,
  setShowSettings,
  isFullscreen,
  setIsFullscreen,
  isMinimized,
  setIsMinimized,
  setIsOpen,
}: ChatHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-[#2699fe] to-[#1a7dd9] p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#2699fe]"
            style={{ backgroundColor: "#10b981" }}
          />
        </div>
        <div>
          <h3 className="font-bold text-white">
            {selectedUserName || "Selecione um usuário"}
          </h3>
          <p className="text-xs text-white/80">{onlineCount} online</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {showSearch ? (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 200, opacity: 1 }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="pl-10 h-8 bg-white/10 border-white/20 text-white placeholder-white/60 rounded-lg"
            />
          </motion.div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSearch((s) => !s)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Search className="w-4 h-4 text-white" />
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowSettings((s) => !s)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4 text-white" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsFullscreen((f) => !f)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-white" />
          ) : (
            <Maximize2 className="w-4 h-4 text-white" />
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsMinimized((m) => !m)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Minimize2 className="w-4 h-4 text-white" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(false)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </motion.button>
      </div>
    </div>
  );
}
