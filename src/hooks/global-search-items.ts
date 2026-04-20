export type GlobalSearchItem = {
  id: string;
  label: string;
  href: string;
  category: string;
  description?: string;
  keywords: string[];
};

export const GLOBAL_SEARCH_ITEMS: GlobalSearchItem[] = [
  {
    id: "1",
    label: "Precificação Individual",
    href: "/dashboard/precificacao/precificacao-individual",
    category: "Precificação",
    description: "Acessar tela de precificação individual",
    keywords: ["precificação individual", "individual", "preço individual"],
  },
{
    id: "2",
    label: "Decomposição de Preços",
    href: "/dashboard/precificacao/decomposicao",
    category: "Decomposição",
    description: "Acessar tela de decomposição de preços",
    keywords: ["decomposição", "preços", "precificação"],
  },
  {
    id: "3",
    label: "Dashboard",
    href: "/dashboard",
    category: "Geral",
    description: "Visão geral do sistema",
    keywords: ["dashboard", "painel", "início", "home"],
  },
  {
    id: "4",
    label: "Configurações",
    href: "/dashboard/configuracoes",
    category: "Sistema",
    description: "Gerenciar configurações da plataforma",
    keywords: ["configurações", "ajustes", "preferências", "sistema"],
  }, 
  {
    id: "5",
    label: "Custos",
    href: "/dashboard/precificacao/custos",
    category: "Custos",
    description: "Acessar tela de custos da plataforma",
    keywords: ["custos", "custo", "gastos", "financeiro"],
  }, 
  {
    id: "6",
    label: "Anúncios",
    href: "/dashboard/anuncios",
    category: "Anúncios",
    description: "Acessar tela de anúncios da plataforma",
    keywords: ["anúncios", "anuncio", "publicidade", "marketing"],    
  },
  {
    id: "7",
    label: "Automação de Planilhas",
    href: "/dashboard/automacoes/automacao-planilhas",
    category: "Automação",
    description: "Acessar tela de automações de planilhas",
    keywords: ["automação", "planilha", "automatização", "excel"],
  },
{
    id: "9",
    label: "Bling",
    href: "/dashboard/marketplaces/bling",
    category: "Marketplaces",
    description: "Gerenciar o Bling da plataforma",
    keywords: ["bling", "integração", "marketplace", "marketplaces"],   
  },
{
    id: "10",
    label: "Tray",
    href: "/dashboard/marketplaces/tray",
    category: "Marketplaces",
    description: "Gerenciar o Tray da plataforma",
    keywords: ["tray", "integração", "marketplace", "marketplaces"],   
  },
  {
    id: "11",
    label: "Shopee",
    href: "/dashboard/marketplaces/shopee",
    category: "Marketplaces",
    description: "Gerenciar o Shopee da plataforma",
    keywords: ["shopee", "integração", "marketplace", "marketplaces"],   
  },
  {
    id: "12",
    label: "Feedbacks",
    href: "/dashboard/configuracao?tab=feedbacks",
    category: "Feedbacks",
    description: "comentar feedbacks para a plataforma",
    keywords: ["feedbacks", "comentários", "avaliações", "usuário"],   
  },
{
    id: "13",
    label: "Perfil",
    href: "/dashboard/configuracao?tab=perfil",
    category: "Perfil",
    description: "Gerenciar o perfil da plataforma",
    keywords: ["perfil", "usuário", "conta", "configurações"],   
  },
{
    id: "14",
    label: "Segurança",
    href: "/dashboard/configuracao?tab=seguranca",
    category: "Segurança",
    description: "Gerenciar as configurações de segurança da plataforma",
    keywords: ["segurança", "seguro", "proteção", "configurações"],   
  },
{
    id: "15",
    label: "Notificações",
    href: "/dashboard/configuracao?tab=notificacoes",
    category: "Notificações",
    description: "Gerenciar as configurações de notificações da plataforma",
    keywords: ["notificações", "avisos", "alertas", "configurações"],   
  },
{
    id: "16",
    label: "Preferências",
    href: "/dashboard/configuracao?tab=preferencias",
    category: "Preferências",
    description: "Gerenciar as preferências da plataforma",
    keywords: ["preferências", "configurações", "ajustes", "personalização"],   
  },
{
    id: "17",
    label: "Hub",
    href: "/dashboard/hub",
    category: "Hub",
    description: "Acessar o Hub da plataforma",
    keywords: ["hub", "central", "integração", "marketplaces"],   
  }, 
];