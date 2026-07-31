import type { Papel } from "@/auth/AuthProvider";
import type { NavSection } from "@/navigation/intranetNavConfig";
import { getSetoresAcessiveis, setorConfigToNavSector } from "@/navigation/setoresConfig";

/**
 * Substitui a seção estática "Setores" pela lista de setores acessíveis ao usuário.
 */
export function personalizeNavSetores(sections: NavSection[], papeis: Papel[], email?: string | null): NavSection[] {
  const out: NavSection[] = [];

  for (const sec of sections) {
    if (sec.id !== "setores") {
      out.push(sec);
      continue;
    }

    const setoresNav = getSetoresAcessiveis(papeis, email).map(setorConfigToNavSector);
    if (setoresNav.length > 0) {
      out.push({
        id: "setores-todos",
        label: "Setores",
        type: "nested",
        sectors: setoresNav,
      });
    }
  }

  return out;
}
