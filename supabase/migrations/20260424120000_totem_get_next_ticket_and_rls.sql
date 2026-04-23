-- Totem: RPC get_next_ticket_number acessa painel_tickets; com RLS, use SECURITY DEFINER.
-- Aplicar no SQL Editor do Supabase se o totem der erro na RPC (permissão / RLS) ou 23505 em ticket_code.

CREATE OR REPLACE FUNCTION get_next_ticket_number(p_queue_id uuid)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date := (timezone('America/Sao_Paulo', now()))::date;
  next_n integer;
BEGIN
  SELECT COALESCE(MAX(number), 0) + 1
  INTO next_n
  FROM painel_tickets
  WHERE queue_id = p_queue_id
    AND ticket_date = v_date;

  RETURN next_n;
END;
$$;

-- Se a tabela ainda NÃO tiver coluna ticket_date, comente o bloco acima e ajuste, ou crie a coluna
-- (ver migrations anteriores do painel) antes de aplicar.

REVOKE ALL ON FUNCTION get_next_ticket_number(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_next_ticket_number(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_next_ticket_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_ticket_number(uuid) TO service_role;

-- Unique global em ticket_code obsoleto: código curto repete noutro dia
ALTER TABLE public.painel_tickets
  DROP CONSTRAINT IF EXISTS painel_tickets_queue_ticket_code_unique;
DROP INDEX IF EXISTS public.painel_tickets_queue_ticket_code_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'painel_tickets_queue_date_number'
      AND conrelid = 'public.painel_tickets'::regclass
  ) THEN
    ALTER TABLE public.painel_tickets
      ADD CONSTRAINT painel_tickets_queue_date_number
      UNIQUE (queue_id, ticket_date, number);
  END IF;
END $$;
