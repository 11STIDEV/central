-- Pré-requisito para 20260424120000: coluna de dia (se ainda não existir)
ALTER TABLE public.painel_tickets
  ADD COLUMN IF NOT EXISTS ticket_date date;

UPDATE public.painel_tickets
SET ticket_date = (created_at AT TIME ZONE 'America/Sao_Paulo')::date
WHERE ticket_date IS NULL;

-- Apenas se quiseres NOT NULL: descomentar com cuidado se não houver NULLs
-- ALTER TABLE public.painel_tickets ALTER COLUMN ticket_date SET NOT NULL;
