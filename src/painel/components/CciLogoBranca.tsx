import { cn } from "@/lib/utils";

const SRC = "/logo-cci-branca.png";

type CciLogoBrancaProps = {
  className?: string;
  /** Altura em px; largura segue proporção da arte. */
  height?: number;
};

export function CciLogoBranca({ className, height = 40 }: CciLogoBrancaProps) {
  return (
    <img
      src={SRC}
      alt="Colégio CCI"
      className={cn("w-auto max-w-[min(100%,240px)] object-contain object-left", className)}
      style={{ height }}
      loading="eager"
      decoding="async"
    />
  );
}
