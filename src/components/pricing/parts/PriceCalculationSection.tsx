import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Store,
  ShoppingBag,
  Handshake,
  Check,
  X,
  Copy,
  CheckCheck,
  ArrowUpCircle,
} from "lucide-react";
import { ClearAndDownloadActions } from "./ClearAndDownloadActions";
import { AcrescimosSection } from "./AcrescimosSection";
import { AnimatedNumber } from "./AnimatedNumber";
import type { Calculo } from "../PricingCalculatorModern";
import { CHANNELS, getChannelDef } from "@/components/costs/hooks/channelsconfig";
import type { ChannelKey } from "@/components/costs/hooks/channelsconfig";
import type { BrandOverrides, ManualFlags } from "@/components/costs/hooks/usechannelpricing";

type Empresa = "pikot" | "sobaquetas";

// =====================
// Único ponto "hardcoded" que resta: identidade visual por canal.
// Para adicionar canal novo: 1 entrada aqui + 1 objeto em
// channelsConfig.ts. Nada mais precisa mudar neste arquivo.
// =====================
const MagaluLogo = () => {
  return (
    <span className="select-none text-[10px] font-black leading-none tracking-tight text-white">
      Magalu
    </span>
  );
};

const TiktokLogo = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fill="currentColor"
        d="M33.5 6.5c1.4 3.6 4.4 6.4 8.1 7.2v6.4c-2.9 0-5.7-.8-8.1-2.2v13.4c0 6.9-5.6 12.6-12.5 12.6S8.5 37.2 8.5 30.3c0-6.5 5.1-11.9 11.5-12.5v6.5c-2.9.6-5 3.1-5 6.1 0 3.4 2.7 6.1 6.1 6.1s6.1-2.7 6.1-6.1V4h6.3c0 .9.1 1.7.3 2.5Z"
      />
    </svg>
  );
};

type ChannelVisual = {
  icon: React.ReactNode;
  iconClassName: string;
  dotClassName: string;
  priceClassName: string;
  shortLabel: string;
};

const CHANNEL_VISUAL: Record<ChannelKey, ChannelVisual> = {
  loja: {
    icon: <Store className="h-5 w-5 text-[#1a8ceb]" />,
    iconClassName: "border-[#1a8ceb]/35 bg-[#1a8ceb]/15",
    dotClassName: "bg-[#1a8ceb]",
    priceClassName: "text-neutral-100",
    shortLabel: "Loja",
  },
  shopee: {
    icon: <ShoppingBag className="h-5 w-5 text-white" />,
    iconClassName: "border-orange-500/30 bg-orange-500",
    dotClassName: "bg-orange-500",
    priceClassName: "text-orange-400",
    shortLabel: "Shopee",
  },
  magalu: {
    icon: <MagaluLogo />,
    iconClassName: "border-[#1a8ceb]/40 bg-[#1a8ceb]",
    dotClassName: "bg-[#1a8ceb]",
    priceClassName: "text-[#1a8ceb]",
    shortLabel: "Magalu",
  },
  mlClassico: {
    icon: <Handshake className="h-5 w-5 text-white" />,
    iconClassName: "border-yellow-500/30 bg-yellow-500/80",
    dotClassName: "bg-yellow-500",
    priceClassName: "text-yellow-400",
    shortLabel: "Clássico",
  },
  mlPremium: {
    icon: <Handshake className="h-5 w-5 text-white" />,
    iconClassName: "border-yellow-500/30 bg-yellow-500/80",
    dotClassName: "bg-yellow-500",
    priceClassName: "text-yellow-400",
    shortLabel: "Premium",
  },
  tiktok: {
    icon: <TiktokLogo className="h-5 w-5 text-white" />,
    iconClassName: "border-white/20 bg-black",
    dotClassName: "bg-white",
    priceClassName: "text-white",
    shortLabel: "TikTok",
  },
};

const STORAGE_KEY = "pricing.visibleBlocks.v6";

const fields: Array<{
  key: keyof Calculo;
  label: string;
  suffix?: string;
  unit: string;
}> = [
  { key: "desconto", label: "Desconto", suffix: "%", unit: "(%)" },
  { key: "embalagem", label: "Embalagem", suffix: "R$", unit: "(R$)" },
  { key: "frete", label: "Frete", suffix: "R$", unit: "(R$)" },
  { key: "imposto", label: "Imposto", suffix: "%", unit: "(%)" },
  { key: "comissao", label: "Comissão", suffix: "%", unit: "(%)" },
  { key: "margem", label: "Margem de Lucro", suffix: "%", unit: "(%)" },
  { key: "marketing", label: "Marketing", suffix: "%", unit: "(%)" },
];

/**
 * FIX (bug do "0" sendo tratado como vazio em TODOS os campos):
 * -----------------------------------------------------------------
 * A versão anterior (`isEmptyOrZero`) considerava `numberValue === 0`
 * como "vazio" — isso fazia com que digitar "0" em QUALQUER campo
 * (desconto, imposto, margem, frete, comissão, marketing) desligasse
 * a flag manual (`setManualFlag`/`brandOverrides.setEdited(..., false)`)
 * no blur, mesmo o usuário tendo digitado algo válido. Resultado: o
 * engine automático (banco/regra de marca/brand override) assumia o
 * controle de volta e sobrescrevia o "0" digitado no próximo ciclo.
 *
 * `isEmpty` só considera vazio quando a STRING está realmente vazia
 * (ou não é um número válido) — nunca quando o valor numérico é zero.
 * "0" agora é tratado como qualquer outro valor manual: liga a flag
 * no onChange, mantém a flag ligada no onBlur (nunca desliga por ser
 * zero). Sem conflito com o modo "banco": a flag continua sendo a
 * ÚNICA fonte de verdade consultada pelos engines automáticos — só
 * desliga quando o campo fica de fato vazio (usuário apagou tudo).
 */
const isEmpty = (value: string) => {
  const normalized = (value || "").trim();

  if (normalized === "") return true;

  return !isFinite(Number(normalized));
};

const ChannelIcon = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) => {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm ${className}`}
    >
      {children}
    </div>
  );
};

type FieldInputProps = {
  value: string | undefined;
  fieldKey: keyof Calculo;
  editingKey: string;
  suffix?: string;
  inputRef: (element: HTMLInputElement | null) => void;
  navIndex: number;
  totalFields: number;
  refs: React.MutableRefObject<HTMLInputElement[]>;
  onChange: (key: keyof Calculo, value: string) => void;
  onBlur: (key: keyof Calculo, value: string) => void;
  isEditing: (key: string) => boolean;
  setEditing: (key: string, editing: boolean) => void;
  toDisplay: (value: string) => string;
  toInternal: (value: string) => string;
  handleLinearNav: (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    refs: React.MutableRefObject<HTMLInputElement[]>,
    total: number
  ) => void;
};

/**
 * Memoizado: com 6 canais x 7 campos = 42 instâncias deste componente,
 * digitar em UM campo não pode mais forçar re-render dos outros 41.
 *
 * O comparador customizado ignora `isEditing`/`setEditing`/`toDisplay`/
 * `toInternal`/`handleLinearNav`/`onChange`/`onBlur` na comparação de
 * função (assumindo que agora são estáveis via useCallback no pai) e
 * compara apenas os valores que de fato mudam a renderização deste
 * campo específico: `value` e o estado de edição do PRÓPRIO campo.
 *
 * -----------------------------------------------------------------
 * BUFFER LOCAL (correção do "input volta ao digitar"):
 * -----------------------------------------------------------------
 * Enquanto o campo está em foco, o valor exibido vem de um state
 * interno (`localValue`), NÃO do `value` vindo de fora. Isso existe
 * porque múltiplos useEffects no hook pai (engine de comissão/frete,
 * engine de embalagem, brand overrides — um por canal) podem disparar
 * entre uma tecla digitada e outra, sobrescrevendo `calculos[key]`
 * antes da flag manual "vencer a corrida". Sem o buffer, o campo
 * controlado exibia esse valor sobrescrito e "revertia" visualmente
 * enquanto o usuário digitava.
 *
 * O buffer só é resincronizado com o valor externo quando o campo
 * NÃO está em edição (troca de canal, reset, regra automática
 * aplicada sem o usuário estar com foco ali). No blur, o valor final
 * já foi propagado pro estado externo normalmente via onChange/onBlur.
 */
const FieldInput = React.memo(
  ({
    value,
    fieldKey,
    editingKey,
    suffix,
    inputRef,
    navIndex,
    totalFields,
    refs,
    onChange,
    onBlur,
    isEditing,
    setEditing,
    toDisplay,
    toInternal,
    handleLinearNav,
  }: FieldInputProps) => {
    const rawValue = value || "";
    const editing = isEditing(editingKey);

    const [localValue, setLocalValue] = React.useState(rawValue);

    React.useEffect(() => {
      if (!editing) {
        setLocalValue(rawValue);
      }
    }, [rawValue, editing]);

    const displayValue = editing ? localValue : toDisplay(rawValue);

    return (
      <div className="mx-auto flex h-10 w-full max-w-[96px] items-center rounded border border-white/10 bg-[#070707] px-2 transition focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30">
        <input
          ref={inputRef}
          value={displayValue}
          inputMode="decimal"
          onFocus={() => {
            setLocalValue(rawValue);
            setEditing(editingKey, true);
          }}
          onBlur={(event) => {
            setEditing(editingKey, false);

            const internalValue = toInternal(event.target.value);

            onBlur(fieldKey, internalValue);
          }}
          onChange={(event) => {
            setLocalValue(event.target.value);

            const internalValue = toInternal(event.target.value);

            onChange(fieldKey, internalValue);
          }}
          onKeyDown={(event) =>
            handleLinearNav(event, navIndex, refs, totalFields)
          }
          className="
            h-full w-full min-w-0 bg-transparent text-center text-sm font-semibold text-white
            outline-none placeholder:text-white/20
            focus:outline-none focus:ring-0
            focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0
          "
        />

        {suffix && (
          <span className="ml-1 shrink-0 text-xs font-semibold text-white/45">
            {suffix}
          </span>
        )}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.value === next.value &&
      prev.fieldKey === next.fieldKey &&
      prev.editingKey === next.editingKey &&
      prev.suffix === next.suffix &&
      prev.navIndex === next.navIndex &&
      prev.totalFields === next.totalFields &&
      prev.isEditing(prev.editingKey) === next.isEditing(next.editingKey)
    );
  }
);

FieldInput.displayName = "FieldInput";

type PriceCalculationSectionProps = {
  calculos: Record<ChannelKey, Calculo>;
  precos: Record<ChannelKey, number>;

  manualFlags: Record<ChannelKey, ManualFlags>;
  setManualFlag: (
    key: ChannelKey,
    field: keyof ManualFlags,
    value: boolean
  ) => void;

  brandOverrides: Record<ChannelKey, BrandOverrides>;

  setCalculo: (
    key: ChannelKey,
    updater: (prev: Calculo) => Calculo
  ) => void;

  channelRefsMap: Record<ChannelKey, HTMLInputElement[]>;

  acrescimos: any;
  setAcrescimos: (value: any) => void;

  isEditing: (key: string) => boolean;
  setEditing: (key: string, editing: boolean) => void;
  toDisplay: (v: string) => string;
  toInternal: (v: string) => string;

  handleLinearNav: (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    refs: React.MutableRefObject<HTMLInputElement[]>,
    total: number
  ) => void;

  acrescimosRefs: React.MutableRefObject<HTMLInputElement[]>;

  handleEmbalagemBlurShared: (raw: string) => void;
  handleEmbalagemChangeShared: (raw: string) => void;
  handleEmbalagemChangeChannel: (key: ChannelKey, raw: string) => void;
  handleEmbalagemBlurChannel: (key: ChannelKey, raw: string) => void;

  handleDownload: () => void;
  handleClearAll: () => void;
  isClearing: boolean;
  clicks: number;

  statusAcrescimo: any;

  syncDescontoFromLoja: (descontoInternal: string) => void;

  refetchDbRules?: () => void;

  // ✅ NOVO — empresa/loja ativa, controlada pelo componente pai
  // (PricingCalculatorModern), compartilhada com ProductSection.
  empresa: Empresa;
  setEmpresa: (value: Empresa) => void;
};

type ChannelRow = {
  key: ChannelKey;
  title: string;
  subtitle: string;
  visual: ChannelVisual;
  state: Calculo;
  preco: number;
  refs: React.MutableRefObject<HTMLInputElement[]>;
};

export const PriceCalculationSection: React.FC<
  PriceCalculationSectionProps
> = ({
  calculos,
  precos,

  manualFlags,
  setManualFlag,

  brandOverrides,

  setCalculo,
  channelRefsMap,

  acrescimos,
  setAcrescimos,

  isEditing,
  setEditing,
  toDisplay,
  toInternal,

  handleLinearNav,
  acrescimosRefs,

  handleEmbalagemBlurShared,
  handleEmbalagemChangeShared,
  handleEmbalagemChangeChannel,
  handleEmbalagemBlurChannel,

  handleDownload,
  handleClearAll,
  isClearing,
  clicks,

  statusAcrescimo,

  syncDescontoFromLoja,

  refetchDbRules,

  empresa,
  setEmpresa,
}) => {
  const defaultVisible: Record<ChannelKey, boolean> = React.useMemo(
    () =>
      Object.fromEntries(
        CHANNELS.map((c) => [c.key, true])
      ) as Record<ChannelKey, boolean>,
    []
  );

  const [visible, setVisible] =
    React.useState<Record<ChannelKey, boolean>>(defaultVisible);

  const [isLayoutOpen, setIsLayoutOpen] = React.useState(false);

  const [copiedKey, setCopiedKey] =
    React.useState<ChannelKey | null>(null);

  // ---- Seletor de empresa (Pikot Shop / Sóbaquetas) ----
  // ✅ `empresa`/`setEmpresa` agora vêm via props do componente pai —
  // removido o useState local e os useEffects de localStorage, que
  // ficaram centralizados em PricingCalculatorModern.
  const [isEmpresaOpen, setIsEmpresaOpen] = React.useState(false);

  const pikotSnapshotRef = React.useRef<Record<
    ChannelKey,
    Calculo
  > | null>(null);

  // =====================
  // Imposto é CONSTANTE FIXA por empresa — nunca vem de pricing_rules.
  // 10% Sóbaquetas / 14% Pikot Shop. Respeita manualFlags.imposto:
  // se o usuário já editou manualmente, a troca de empresa não
  // sobrescreve o valor.
  // =====================
  const applyEmpresaOverrides = React.useCallback(
    (emp: Empresa) => {
      const impostoFixo = emp === "sobaquetas" ? "10" : "14";

      CHANNELS.forEach((def) => {
        setCalculo(def.key, (previous) => {
          const jaEhManual = manualFlags[def.key]?.imposto;

          return {
            ...previous,
            imposto: jaEhManual ? previous.imposto : impostoFixo,
            ...(def.key === "loja" && emp === "sobaquetas"
              ? { comissao: "0" }
              : {}),
          };
        });
      });
    },
    [setCalculo, manualFlags]
  );

  // Reaplica os overrides no mount, pois os calculos são
  // inicializados sempre com valores padrão do Pikot Shop,
  // independente da `empresa` já resolvida (via localStorage) no pai.
  const didApplyInitialOverridesRef = React.useRef(false);

  React.useEffect(() => {
    if (didApplyInitialOverridesRef.current) return;
    didApplyInitialOverridesRef.current = true;

    applyEmpresaOverrides(empresa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectEmpresa = (next: Empresa) => {
    if (next === empresa) {
      setIsEmpresaOpen(false);
      return;
    }

    if (next === "sobaquetas") {
      pikotSnapshotRef.current = { ...calculos };
    } else {
      const snapshot = pikotSnapshotRef.current;

      if (snapshot) {
        CHANNELS.forEach((def) => {
          setCalculo(def.key, () => snapshot[def.key]);
        });
      }
    }

    applyEmpresaOverrides(next);
    setEmpresa(next);
    setIsEmpresaOpen(false);
  };

  const closeEmpresaOnOutside = React.useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target) return;

      if (target.closest?.("[data-empresa-dropdown]")) {
        return;
      }

      setIsEmpresaOpen(false);
    },
    []
  );

  React.useEffect(() => {
    if (!isEmpresaOpen) return;

    window.addEventListener("mousedown", closeEmpresaOnOutside);

    return () => {
      window.removeEventListener("mousedown", closeEmpresaOnOutside);
    };
  }, [isEmpresaOpen, closeEmpresaOnOutside]);

  const empresaColorClass =
    empresa === "sobaquetas" ? "text-orange-400" : "text-[#1a8ceb]";
  // ---- Fim seletor de empresa ----

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<
        Record<ChannelKey, boolean>
      >;

      const next: Record<ChannelKey, boolean> = {
        ...defaultVisible,
        ...parsed,
      };

      const visibleCount = Object.values(next).filter(Boolean).length;

      setVisible(
        visibleCount === 0
          ? {
              ...next,
              loja: true,
            }
          : next
      );
    } catch {
      // Ignora erros de acesso ao localStorage.
    }
  }, [defaultVisible]);

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visible));
    } catch {
      // Ignora erros de acesso ao localStorage.
    }
  }, [visible]);

  const ensureAtLeastOneVisible = React.useCallback(
    (next: Record<ChannelKey, boolean>) => {
      const visibleCount = Object.values(next).filter(Boolean).length;

      if (visibleCount === 0) {
        return {
          ...next,
          loja: true,
        };
      }

      return next;
    },
    []
  );

  const hideBlock = React.useCallback(
    (key: ChannelKey) => {
      setVisible((previous) =>
        ensureAtLeastOneVisible({
          ...previous,
          [key]: false,
        })
      );
    },
    [ensureAtLeastOneVisible]
  );

  const toggleBlock = (key: ChannelKey) => {
    setVisible((previous) =>
      ensureAtLeastOneVisible({
        ...previous,
        [key]: !previous[key],
      })
    );
  };

  const restore = React.useCallback((key: ChannelKey) => {
    setVisible((previous) => ({
      ...previous,
      [key]: true,
    }));
  }, []);

  const hiddenBlocks = React.useMemo(
    () => CHANNELS.filter((c) => !visible[c.key]),
    [visible]
  );

  const closeLayoutOnOutside = React.useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target) return;

      if (target.closest?.("[data-layout-dropdown]")) {
        return;
      }

      setIsLayoutOpen(false);
    },
    []
  );

  React.useEffect(() => {
    if (!isLayoutOpen) return;

    window.addEventListener("mousedown", closeLayoutOnOutside);

    return () => {
      window.removeEventListener("mousedown", closeLayoutOnOutside);
    };
  }, [isLayoutOpen, closeLayoutOnOutside]);

  // =====================
  // Rows derivadas 100% de CHANNELS — canal novo aparece aqui
  // automaticamente, sem editar este arquivo.
  //
  // Memoizado: sem isso, cada canal recebia um objeto NOVO de refs
  // (`{ current: channelRefsMap[def.key] }`) a cada render, mesmo que
  // `channelRefsMap` (a origem) seja estável durante toda a vida do
  // componente. Isso gerava lixo de memória e invalidava a igualdade
  // referencial de `row.refs` usada como prop em FieldInput/handleLinearNav.
  // =====================
  const rows: ChannelRow[] = React.useMemo(
    () =>
      CHANNELS.map((def) => ({
        key: def.key,
        title: def.title,
        subtitle: def.subtitle,
        visual: CHANNEL_VISUAL[def.key],
        state: calculos[def.key],
        preco: precos[def.key],
        refs: {
          current: channelRefsMap[def.key],
        } as React.MutableRefObject<HTMLInputElement[]>,
      })),
    [calculos, precos, channelRefsMap]
  );

  const visibleRows = React.useMemo(
    () => rows.filter((row) => visible[row.key]),
    [rows, visible]
  );

  const totalFields = fields.length;

  // =====================
  // Handlers genéricos — substituem os blocos if/else por canal.
  // Usam apenas as flags declaradas no ChannelDef.
  //
  // Imposto NÃO passa mais por brandOverrides: é constante fixa
  // por empresa (10%/14%), controlada só por manualFlags.imposto.
  //
  // Desconto na Loja é caso especial: `syncDescontoFromLoja` propaga
  // o valor pra TODOS os canais (não só a Loja), então a flag de
  // "edição manual" precisa ser marcada em TODOS os canais também —
  // senão o useEffect de usebrandpricingoverrides dos outros 5 canais
  // roda de novo com `flags.desconto === false` e sobrescreve o valor
  // sincronizado de volta pro default/regra de marca.
  //
  // Envolvidos em useCallback: são passados como props para os 42
  // FieldInput (agora memoizados) — sem isso, o React.memo do
  // FieldInput seria invalidado a cada render do componente pai.
  // =====================
  const handleChange = React.useCallback(
    (row: ChannelRow, field: keyof Calculo, internalValue: string) => {
      const def = getChannelDef(row.key);

      if (field === "embalagem") {
        if (def.sharesEmbalagem) {
          handleEmbalagemChangeShared(internalValue);
        } else {
          handleEmbalagemChangeChannel(row.key, internalValue);
        }

        return;
      }

      if (row.key === "loja" && field === "desconto") {
        CHANNELS.forEach((c) => {
          if (getChannelDef(c.key).hasBrandOverrides) {
            brandOverrides[c.key].setEdited("desconto", true);
          }
        });
        syncDescontoFromLoja(internalValue);
        return;
      }

      if (
        def.hasBrandOverrides &&
        (field === "margem" || field === "marketing" || field === "desconto")
      ) {
        brandOverrides[row.key].setEdited(field, true);
      }

      if (field === "imposto") {
        setManualFlag(row.key, "imposto", true);
      }

      if (def.allowManualComissaoFrete && field === "comissao") {
        setManualFlag(row.key, "comissao", true);
      }

      if (def.allowManualComissaoFrete && field === "frete") {
        setManualFlag(row.key, "frete", true);
      }

      setCalculo(row.key, (previous) => ({
        ...previous,
        [field]: internalValue,
      }));
    },
    [
      handleEmbalagemChangeShared,
      handleEmbalagemChangeChannel,
      syncDescontoFromLoja,
      brandOverrides,
      setManualFlag,
      setCalculo,
    ]
  );

  /**
   * FIX aplicado aqui: todas as chamadas que decidem "desligar a flag
   * manual" agora usam `isEmpty` em vez de `isEmptyOrZero`. "0" nunca
   * mais desliga a flag — só desliga quando o campo fica realmente
   * vazio (string "").
   */
  const handleBlur = React.useCallback(
    (row: ChannelRow, field: keyof Calculo, internalValue: string) => {
      const def = getChannelDef(row.key);

      if (field === "embalagem") {
        if (def.sharesEmbalagem) {
          handleEmbalagemBlurShared(internalValue);
        } else {
          handleEmbalagemBlurChannel(row.key, internalValue);
        }

        return;
      }

      if (row.key === "loja" && field === "desconto") {
        if (isEmpty(internalValue)) {
          CHANNELS.forEach((c) => {
            if (getChannelDef(c.key).hasBrandOverrides) {
              brandOverrides[c.key].setEdited("desconto", false);
            }
          });
        }
        syncDescontoFromLoja(internalValue);
        return;
      }

      if (
        def.hasBrandOverrides &&
        (field === "margem" || field === "marketing" || field === "desconto") &&
        isEmpty(internalValue)
      ) {
        brandOverrides[row.key].setEdited(field, false);
      }

      if (field === "imposto" && isEmpty(internalValue)) {
        setManualFlag(row.key, "imposto", false);
      }

      if (
        def.allowManualComissaoFrete &&
        field === "comissao" &&
        isEmpty(internalValue)
      ) {
        setManualFlag(row.key, "comissao", false);
      }

      if (
        def.allowManualComissaoFrete &&
        field === "frete" &&
        isEmpty(internalValue)
      ) {
        setManualFlag(row.key, "frete", false);
      }

      setCalculo(row.key, (previous) => ({
        ...previous,
        [field]: internalValue,
      }));
    },
    [
      handleEmbalagemBlurShared,
      handleEmbalagemBlurChannel,
      syncDescontoFromLoja,
      brandOverrides,
      setManualFlag,
      setCalculo,
    ]
  );

  const formatCopyValue = React.useCallback((value: number) => {
    return Number(value || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, []);

  const handleCopyPrice = React.useCallback(
    async (row: ChannelRow) => {
      const value = formatCopyValue(row.preco);

      try {
        await navigator.clipboard.writeText(value);

        setCopiedKey(row.key);

        setTimeout(() => {
          setCopiedKey(null);
        }, 1200);
      } catch {
        const textarea = document.createElement("textarea");

        textarea.value = value;

        document.body.appendChild(textarea);

        textarea.select();

        document.execCommand("copy");

        document.body.removeChild(textarea);

        setCopiedKey(row.key);

        setTimeout(() => {
          setCopiedKey(null);
        }, 1200);
      }
    },
    [formatCopyValue]
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section
        data-layout-dropdown
        data-empresa-dropdown
        className="relative rounded border border-white/10 bg-[#151515] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]"
      >
        <div className="relative mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#1a8ceb] text-xs font-bold text-white">
              3.
            </span>

            <h2 className="text-base font-semibold text-white">
              Preço de Venda por Canal
            </h2>
          </div>

          <div
            className={[
              "pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border bg-white/[0.03] px-3 py-1 sm:flex",
              empresa === "sobaquetas"
                ? "border-orange-400/20"
                : "border-[#1a8ceb]/20",
            ].join(" ")}
          >
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                empresa === "sobaquetas" ? "bg-orange-400" : "bg-[#1a8ceb]",
              ].join(" ")}
            />

            <span
              className={[
                "text-[11px] font-semibold uppercase tracking-[0.14em]",
                empresa === "sobaquetas" ? "text-orange-400" : "text-[#1a8ceb]",
              ].join(" ")}
            >
              {empresa === "pikot" ? "Pikot Shop" : "Sóbaquetas"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <div className="relative mr-1" data-empresa-dropdown>
              <button
                type="button"
                onClick={() =>
                  setIsEmpresaOpen((current) => !current)
                }
                className={[
                  "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition hover:bg-white/10",
                  empresaColorClass,
                ].join(" ")}
                title={
                  empresa === "pikot" ? "Pikot Shop" : "Sóbaquetas"
                }
                aria-label="Selecionar loja / regras de taxas"
              >
                <Store className="h-4 w-4" />
              </button>

              <AnimatePresence>
                {isEmpresaOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-0 top-10 z-50 w-52 rounded border border-white/10 bg-[#1c1c1c] p-1 shadow-xl"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectEmpresa("pikot")}
                      className={[
                        "relative flex w-full cursor-pointer items-center justify-between rounded px-3 py-2 text-xs transition hover:bg-white/[0.06]",
                        empresa === "pikot"
                          ? "text-[#1a8ceb]"
                          : "text-white/60",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-2">
                        {empresa === "pikot" && (
                          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[#1a8ceb]" />
                        )}
                        Pikot Shop
                      </span>

                      {empresa === "pikot" && (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectEmpresa("sobaquetas")}
                      className={[
                        "relative flex w-full cursor-pointer items-center justify-between rounded px-3 py-2 text-xs transition hover:bg-white/[0.06]",
                        empresa === "sobaquetas"
                          ? "text-orange-400"
                          : "text-white/60",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-2">
                        {empresa === "sobaquetas" && (
                          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-orange-400" />
                        )}
                        Sóbaquetas
                      </span>

                      {empresa === "sobaquetas" && (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <div className="mt-1 border-t border-white/10 px-3 py-2 text-[10px] leading-snug text-white/40">
                      Os impostos e comissões variam de acordo com a loja selecionada.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ClearAndDownloadActions
              handleDownload={handleDownload}
              handleClearAll={handleClearAll}
              isClearing={isClearing}
              clicks={clicks}
              onToggleLayout={() =>
                setIsLayoutOpen((current) => !current)
              }
            />
          </div>
        </div>

        <AnimatePresence>
          {isLayoutOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              className="absolute right-4 top-14 z-50 w-full max-w-[280px] rounded border border-white/10 bg-[#1c1c1c] p-1.5 shadow-xl"
            >
              <div className="mb-2 flex items-center justify-between px-0.5">
                <div className="text-xs font-semibold text-white/80">
                  Ajustar layout
                </div>

                <button
                  type="button"
                  onClick={() => setIsLayoutOpen(false)}
                  className="cursor-pointer rounded p-1 transition hover:bg-white/10"
                  title="Fechar ajuste de layout"
                >
                  <X className="h-4 w-4 text-white/70" />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                {CHANNELS.map((def) => {
                  const checked = visible[def.key];
                  const visual = CHANNEL_VISUAL[def.key];

                  return (
                    <button
                      key={def.key}
                      type="button"
                      onClick={() => toggleBlock(def.key)}
                      className={[
                        "flex h-10 cursor-pointer items-center justify-between rounded border border-white/10 px-2 transition",
                        checked ? "bg-white/[0.06]" : "bg-white/[0.02]",
                        "hover:bg-white/[0.09]",
                      ].join(" ")}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${visual.dotClassName}`}
                        />

                        <span className="truncate text-xs text-white/85">
                          {def.title}
                        </span>

                        <span className="shrink-0 text-[10px] text-white/45">
                          ({visual.shortLabel})
                        </span>
                      </div>

                      <div
                        className={[
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded border border-white/10",
                          checked ? "bg-white/10" : "bg-transparent",
                        ].join(" ")}
                      >
                        {checked && (
                          <Check className="h-4 w-4 text-white/80" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setVisible(defaultVisible)}
                className="mt-2 h-9 w-full cursor-pointer rounded border border-white/10 bg-white/[0.02] text-xs text-white/60 transition hover:bg-white/[0.08] hover:text-white/80"
              >
                Mostrar todos
              </button>

              <div className="mt-2 px-0.5 text-[10px] text-white/40">
                Suas escolhas ficam salvas automaticamente.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-hidden rounded border border-white/10">
          <div className="hidden grid-cols-[220px_repeat(7,minmax(92px,1fr))_170px] border-b border-white/10 bg-[#181818] lg:grid">
            <div className="px-4 py-4 text-sm font-semibold text-white">
              Canal
            </div>

            {fields.map((field) => (
              <div
                key={field.key}
                className="px-2 py-4 text-center text-sm font-semibold text-white"
              >
                {field.label}

                <div className="mt-1 text-xs text-white/55">
                  {field.unit}
                </div>
              </div>
            ))}

            <div className="px-4 py-4 text-center text-sm font-semibold text-white">
              Preço de Venda

              <div className="mt-1 text-xs text-white/55">
                Calculado (R$)
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {visibleRows.map((row) => (
              <div
                key={row.key}
                className="group/row grid grid-cols-1 gap-3 bg-[#151515] p-4 lg:grid-cols-[220px_repeat(7,minmax(92px,1fr))_170px] lg:items-center lg:gap-0 lg:p-0"
              >
                <div className="flex items-center justify-between gap-3 lg:px-4 lg:py-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <ChannelIcon className={row.visual.iconClassName}>
                      {row.visual.icon}
                    </ChannelIcon>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">
                        {row.title}
                      </div>

                      <div className="mt-0.5 truncate text-xs text-white/45">
                        {row.subtitle}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => hideBlock(row.key)}
                    className="flex h-7 w-7 cursor-pointer shrink-0 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-white/40 opacity-0 transition hover:bg-white/[0.08] hover:text-white group-hover/row:opacity-100"
                    title={`Ocultar ${row.title}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {fields.map((field, index) => (
                  <div
                    key={`${row.key}-${field.key}`}
                    className="lg:px-2 lg:py-5"
                  >
                    <div className="mb-1 text-xs font-medium text-white/45 lg:hidden">
                      {field.label}
                    </div>

                    <FieldInput
                      value={row.state[field.key]}
                      fieldKey={field.key}
                      editingKey={`${row.key}-${field.key}`}
                      suffix={field.suffix}
                      inputRef={(element) => {
                        row.refs.current[index] = element!;
                      }}
                      navIndex={index}
                      totalFields={totalFields}
                      refs={row.refs}
                      onChange={(key, value) =>
                        handleChange(row, key, value)
                      }
                      onBlur={(key, value) => handleBlur(row, key, value)}
                      isEditing={isEditing}
                      setEditing={setEditing}
                      toDisplay={toDisplay}
                      toInternal={toInternal}
                      handleLinearNav={handleLinearNav}
                    />
                  </div>
                ))}

                <div className="group/price flex items-center justify-between border-t border-white/10 pt-3 lg:border-t-0 lg:px-4 lg:py-5">
                  <span className="text-xs font-medium text-white/45 lg:hidden">
                    Preço de Venda
                  </span>

                  <div className="flex w-full items-center justify-end gap-1.5">
                    <span
                      className={`text-xl font-bold tabular-nums ${row.visual.priceClassName}`}
                    >
                      R${" "}
                      <AnimatedNumber value={Number(row.preco || 0)} />
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCopyPrice(row)}
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-white/10 bg-white/[0.03] text-white/50 opacity-0 transition hover:bg-white/[0.08] hover:text-white group-hover/price:opacity-100"
                      title="Copiar preço"
                    >
                      {copiedKey === row.key ? (
                        <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {hiddenBlocks.length > 0 && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 bg-[#181818] px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-white/50">Ocultos</span>

                {hiddenBlocks.map((def) => (
                  <button
                    key={def.key}
                    type="button"
                    onClick={() => restore(def.key)}
                    className="inline-flex h-8 cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/[0.03] px-3 text-xs text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                    title={`Restaurar ${def.title}`}
                  >
                    <ArrowUpCircle className="h-4 w-4" />

                    {CHANNEL_VISUAL[def.key].shortLabel}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setVisible(defaultVisible)}
                className="h-8 cursor-pointer rounded border border-white/10 px-3 text-xs text-white/60 transition hover:bg-white/[0.05] hover:text-white"
              >
                Restaurar todos
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <AcrescimosSection
        acrescimos={acrescimos}
        setAcrescimos={setAcrescimos}
        isEditing={isEditing}
        setEditing={setEditing}
        toDisplay={toDisplay}
        toInternal={toInternal}
        handleLinearNav={handleLinearNav}
        acrescimosRefs={acrescimosRefs}
        statusAcrescimo={statusAcrescimo}
      />
    </div>
  );
};
