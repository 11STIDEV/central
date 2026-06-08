import fs from "fs";

export const SETOR_LINK_KEYS = new Set([
  "professores",
  "disciplinar",
  "secretaria",
  "servicos-gerais",
  "publicidade",
  "dp-financeiro",
  "primeiros-socorros",
  "direcao",
  "clat",
  "portal-colaborador",
]);

/** URLs internas ou sensíveis — não podem ser cadastradas em portal-colaborador. */
const PORTAL_COLABORADOR_BLOCKED_PATH = /\/vale-adiantamento/i;

function isAllowedPortalColaboradorUrl(url) {
  if (!isValidHttpUrl(url)) return false;
  const lower = url.trim().toLowerCase();
  if (lower.startsWith("/")) return false;
  try {
    const u = new URL(url);
    if (PORTAL_COLABORADOR_BLOCKED_PATH.test(u.pathname)) return false;
  } catch {
    return false;
  }
  return true;
}

export function isValidSetorKey(setor) {
  return typeof setor === "string" && SETOR_LINK_KEYS.has(setor);
}

function isValidHttpUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * @param {unknown} groups
 * @returns {{ title: string, links: { title: string, url: string }[] }[] | null}
 */
export function normalizarGroups(groups, opts = {}) {
  const { portalColaborador = false } = opts;
  if (!Array.isArray(groups)) return null;
  const out = [];
  for (const g of groups) {
    if (!g || typeof g !== "object") continue;
    const title = String(g.title ?? "").trim() || "Links";
    const rawLinks = Array.isArray(g.links) ? g.links : [];
    const links = [];
    for (const l of rawLinks) {
      if (!l || typeof l !== "object") continue;
      const linkTitle = String(l.title ?? "").trim();
      const url = String(l.url ?? "").trim();
      const urlOk = portalColaborador ? isAllowedPortalColaboradorUrl(url) : isValidHttpUrl(url);
      if (!linkTitle || !urlOk) continue;
      links.push({ title: linkTitle, url });
    }
    if (links.length > 0) {
      out.push({ title, links });
    }
  }
  return out.length > 0 ? out : null;
}

export function createSetorLinksStore({ arquivo, ensureDataDir }) {
  function lerArquivoCompleto() {
    ensureDataDir();
    try {
      const raw = fs.readFileSync(arquivo, "utf8");
      const j = JSON.parse(raw);
      if (!j || typeof j !== "object" || Array.isArray(j)) return {};
      return j;
    } catch (e) {
      if (e.code !== "ENOENT") {
        console.error("[setor-links] leitura:", e.message);
      }
      return {};
    }
  }

  function salvarArquivoCompleto(mapa) {
    ensureDataDir();
    fs.writeFileSync(arquivo, JSON.stringify(mapa, null, 2), "utf8");
    return mapa;
  }

  function lerGroups(setor) {
    const mapa = lerArquivoCompleto();
    const entry = mapa[setor];
    if (!entry || !Array.isArray(entry.groups)) return null;
    return normalizarGroups(entry.groups, { portalColaborador: setor === "portal-colaborador" });
  }

  function salvarGroups(setor, groups) {
    const normalizado = normalizarGroups(groups, {
      portalColaborador: setor === "portal-colaborador",
    });
    if (!normalizado) {
      const err = new Error("Informe ao menos um link válido (título e URL http/https).");
      err.status = 400;
      throw err;
    }
    const mapa = lerArquivoCompleto();
    mapa[setor] = { groups: normalizado };
    salvarArquivoCompleto(mapa);
    return normalizado;
  }

  return { lerGroups, salvarGroups };
}

/**
 * @param {import("express").Express} app
 * @param {{ arquivo: string, ensureDataDir: () => void, verificarIdTokenUsuario: (t: string) => Promise<{ email: string }>, emailTemPapelAdminNoArquivo: (e: string) => boolean }} deps
 */
export function registerSetorLinksRoutes(app, deps) {
  const store = createSetorLinksStore({
    arquivo: deps.arquivo,
    ensureDataDir: deps.ensureDataDir,
  });

  app.get("/api/setor-links/:setor", (req, res) => {
    const setor = String(req.params.setor || "").trim();
    if (!isValidSetorKey(setor)) {
      return res.status(400).json({ error: "Setor inválido." });
    }
    const groups = store.lerGroups(setor);
    if (!groups) {
      return res.status(404).json({ notFound: true });
    }
    return res.json({ setor, groups, source: "file" });
  });

  app.post("/api/setor-links/:setor", async (req, res) => {
    try {
      const setor = String(req.params.setor || "").trim();
      if (!isValidSetorKey(setor)) {
        return res.status(400).json({ error: "Setor inválido." });
      }
      const { idToken, groups } = req.body || {};
      const { email } = await deps.verificarIdTokenUsuario(idToken);
      if (!deps.emailTemPapelAdminNoArquivo(email)) {
        return res.status(403).json({ error: "Acesso restrito a administradores." });
      }
      const saved = store.salvarGroups(setor, groups);
      return res.json({ ok: true, setor, groups: saved });
    } catch (e) {
      const st = e.status || 500;
      if (st === 401 && e.audDoToken) {
        return res.status(st).json({
          error: `${e.message} Use o mesmo valor de VITE_GOOGLE_CLIENT_ID no server/.env.`,
          audDoToken: e.audDoToken,
        });
      }
      return res.status(st).json({ error: e.message });
    }
  });
}
