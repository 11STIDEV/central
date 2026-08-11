import { apiUrl } from "@/lib/apiBase";
import { parceiroFetch } from "@/parceiro/parceiroSessionApi";
import type { CcipayResumoParceiro, CcipayVendaQr } from "@/lib/ccipay";

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await parceiroFetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `HTTP ${res.status}`);
  }
  return data as T;
}

export async function parceiroCriarVendaQr(lojaId: string, valor: number, descricao?: string) {
  return post<{ venda: CcipayVendaQr; token: string }>("/api/ccipay/vendas/criar", {
    lojaId,
    valor,
    descricao,
  });
}

export async function parceiroListarVendasQr(
  lojaId: string,
  opts?: { status?: string; de?: string; ate?: string },
) {
  return post<{ vendas: CcipayVendaQr[] }>("/api/ccipay/vendas/listar", { lojaId, ...opts });
}

export async function parceiroResumo(lojaId: string) {
  return post<CcipayResumoParceiro>("/api/ccipay/vendas/resumo", { lojaId });
}

export async function parceiroCancelarVenda(vendaId: string) {
  return post<{ venda: CcipayVendaQr }>("/api/ccipay/vendas/cancelar", { vendaId });
}
