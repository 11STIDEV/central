/**
 * Nome da escola para exibição. Substitui rótulos legados do seed/demo.
 */
export function schoolDisplayName(name: string | undefined | null): string | undefined {
  if (name == null || name === "") return undefined;
  const t = name.trim();
  if (t === "Escola Demo") return "Colégio CCI";
  return name;
}
