import { Layers } from "lucide-react";
import type { Papel } from "@/auth/AuthProvider";
import type { NavSection } from "@/navigation/intranetNavConfig";
import {
  buildSetorActivePrefixes,
  getSetoresAcessiveis,
  getSetoresDoUsuario,
  setorConfigToNavSector,
} from "@/navigation/setoresConfig";

/**
 * Substitui a seção "Setores" aninhada por "Meu setor" (atalhos) e, para admin,
 * lista todos os setores acessíveis diretamente no menu.
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

    if (isAdmin) {
      const todosSetores = getSetoresAcessiveis(papeis, email).map(setorConfigToNavSector);
      if (todosSetores.length > 0) {
        out.push({
          id: "setores-todos",
          label: "Setores",
          type: "nested",
          sectors: todosSetores,
        });
      }
    }
  }

  return out;
}
