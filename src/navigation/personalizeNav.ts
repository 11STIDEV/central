import { Layers } from "lucide-react";
import type { Papel } from "@/auth/AuthProvider";
import type { NavSection } from "@/navigation/intranetNavConfig";
import {
  buildSetorActivePrefixes,
  getSetoresDoUsuario,
} from "@/navigation/setoresConfig";

/**
 * Substitui a seção "Setores" por links únicos para páginas de catálogo
 * ("Meu setor" e "Todos os setores") em vez de submenus longos.
 */
export function personalizeNavSetores(sections: NavSection[], papeis: Papel[], email?: string | null): NavSection[] {
  const meusSetores = getSetoresDoUsuario(papeis);
  const isAdmin = papeis.includes("admin");
  const out: NavSection[] = [];

  for (const sec of sections) {
    if (sec.id !== "setores") {
      out.push(sec);
      continue;
    }

    if (meusSetores.length > 0) {
      const label = meusSetores.length === 1 ? "Meu setor" : "Meus setores";
      const title =
        meusSetores.length === 1 ? meusSetores[0].label : label;
      out.push({
        id: "meu-setor",
        label,
        type: "flat",
        items: [
          {
            title,
            url: "/meu-setor",
            icon: Layers,
            activePrefixes: buildSetorActivePrefixes(meusSetores, ["/meu-setor"]),
          },
        ],
      });
    }

    if (isAdmin && sec.type === "nested" && sec.sectors.length > 0) {
      out.push({
        id: "setores-todos",
        label: "Setores",
        type: "flat",
        items: [
          {
            title: "Todos os setores",
            url: "/setores",
            icon: Layers,
            activePrefixes: ["/setores", "/kanban"],
          },
        ],
      });
    }
  }

  return out;
}
