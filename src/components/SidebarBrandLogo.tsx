import { cn } from "@/lib/utils";

const SRC_AZUL = "/logo-cci-azul.png";
const SRC_BRANCA = "/logo-cci-branca.png";

type SidebarBrandLogoProps = {
  /** Sidebar estreita (só ícone): logo menor e centrada. */
  collapsed?: boolean;
  /** Header mobile: altura um pouco menor que a faixa da sidebar expandida. */
  compact?: boolean;
  className?: string;
};

/**
 * Marca CCI: PNG azul em tema claro, PNG branca em `.dark` (sem `useTheme`).
 * Usar PNGs com canal alpha (fundo transparente); não aplicar máscaras CSS sobre o `<img>`.
 */
export function SidebarBrandLogo({ collapsed, compact, className }: SidebarBrandLogoProps) {
  const heightClass = collapsed ? "h-9 max-h-9" : compact ? "h-8 max-h-8" : "h-10 max-h-10";

  return (
    <div
      className={cn(
        "flex min-w-0 shrink-0 items-center",
        !collapsed && "max-w-full",
        collapsed && "justify-center",
        className,
      )}
      role="img"
      aria-label="Grupo CCI"
    >
      <img
        src={SRC_AZUL}
        alt=""
        width={280}
        height={80}
        className={cn(
          "max-w-full w-auto object-contain object-left dark:hidden",
          heightClass,
          collapsed && "max-w-[40px] object-center",
        )}
        decoding="async"
      />
      <img
        src={SRC_BRANCA}
        alt=""
        width={280}
        height={80}
        className={cn(
          "hidden max-w-full w-auto object-contain object-left dark:block",
          heightClass,
          collapsed && "max-w-[40px] object-center",
        )}
        decoding="async"
      />
    </div>
  );
}
