import { apiUrl } from "@/lib/apiBase";
import type { SectorLinkGroup, SectorPageKey } from "@/types/setorLinks";

export type FetchSetorLinksResult =
  | { ok: true; groups: SectorLinkGroup[]; source: "file" }
  | { ok: true; groups: null; notFound: true }
  | { ok: false; error: string };

export async function fetchSetorLinks(setor: SectorPageKey): Promise<FetchSetorLinksResult> {
  try {
    const res = await fetch(apiUrl(`/api/setor-links/${encodeURIComponent(setor)}`));
    const data = (await res.json().catch(() => ({}))) as {
      groups?: SectorLinkGroup[];
      notFound?: boolean;
      error?: string;
    };
    if (res.status === 404 && data.notFound) {
      return { ok: true, groups: null, notFound: true };
    }
    if (!res.ok) {
      return { ok: false, error: typeof data.error === "string" ? data.error : `Erro HTTP ${res.status}` };
    }
    if (Array.isArray(data.groups)) {
      return { ok: true, groups: data.groups, source: "file" };
    }
    return { ok: false, error: "Resposta inválida do servidor." };
  } catch {
    return { ok: false, error: "Não foi possível carregar os atalhos." };
  }
}

export async function saveSetorLinks(
  setor: SectorPageKey,
  idToken: string,
  groups: SectorLinkGroup[],
): Promise<{ ok: true; groups: SectorLinkGroup[] } | { ok: false; error: string }> {
  try {
    const res = await fetch(apiUrl(`/api/setor-links/${encodeURIComponent(setor)}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, groups }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      groups?: SectorLinkGroup[];
      error?: string;
    };
    if (!res.ok) {
      return { ok: false, error: typeof data.error === "string" ? data.error : `Erro HTTP ${res.status}` };
    }
    if (!Array.isArray(data.groups)) {
      return { ok: false, error: "Resposta inválida ao salvar." };
    }
    return { ok: true, groups: data.groups };
  } catch {
    return { ok: false, error: "Falha ao salvar os atalhos." };
  }
}
