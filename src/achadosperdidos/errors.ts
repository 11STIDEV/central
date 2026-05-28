function readMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message ?? "");
  }
  return "";
}

function readDetails(error: unknown): string {
  if (error && typeof error === "object" && "details" in error) {
    return String((error as { details: unknown }).details ?? "");
  }
  return "";
}

export function toLostFoundError(error: unknown, fallback = "Operação não concluída."): string {
  const combined = [readMessage(error), readDetails(error)].filter(Boolean).join(" — ");
  if (!combined) return fallback;

  if (/bucket not found/i.test(combined)) {
    return 'Bucket "lf-items" não encontrado. Crie o bucket público no Storage ou execute scripts/achados-perdidos-schema.sql.';
  }
  if (/registered_by_email/i.test(combined) && /column|does not exist/i.test(combined)) {
    return 'Coluna "registered_by_email" ausente. Rode no SQL Editor: alter table public.lf_items add column if not exists registered_by_email text;';
  }
  if (/row-level security|new row violates|permission denied|not authorized/i.test(combined)) {
    return "Permissão negada no Supabase (RLS). Execute scripts/achados-perdidos-fix-claim-rls.sql no SQL Editor do projeto Achados e Perdidos.";
  }

  return combined;
}

export function throwLostFoundError(error: unknown, fallback?: string): never {
  throw new Error(toLostFoundError(error, fallback));
}
