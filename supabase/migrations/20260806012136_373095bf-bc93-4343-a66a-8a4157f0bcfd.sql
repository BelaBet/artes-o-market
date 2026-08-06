-- 1) Dados financeiros fora da tabela pública ------------------------------
CREATE TABLE public.artisan_billing (
  artisan_id uuid PRIMARY KEY REFERENCES public.artisans(id) ON DELETE CASCADE,
  pagarme_recipient_id text,
  commission_bps integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.artisan_billing TO authenticated;
GRANT ALL ON public.artisan_billing TO service_role;

ALTER TABLE public.artisan_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Somente admin lê dados financeiros"
  ON public.artisan_billing FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Somente admin altera dados financeiros"
  ON public.artisan_billing FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER artisan_billing_updated_at
  BEFORE UPDATE ON public.artisan_billing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.artisan_billing (artisan_id, pagarme_recipient_id, commission_bps)
SELECT id, pagarme_recipient_id, commission_bps FROM public.artisans;

CREATE OR REPLACE FUNCTION public.comissao_bps(_artisan_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT commission_bps FROM public.artisan_billing WHERE artisan_id = _artisan_id),
    (SELECT default_commission_bps FROM public.platform_settings WHERE id)
  );
$$;
REVOKE EXECUTE ON FUNCTION public.comissao_bps(uuid) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.artisans DROP COLUMN pagarme_recipient_id;
ALTER TABLE public.artisans DROP COLUMN commission_bps;

-- 2) profiles: cada um vê o próprio perfil ---------------------------------
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Cada um vê o próprio perfil"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 3) Funções SECURITY DEFINER fora do schema exposto ------------------------
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION private.owns_artisan(_artisan_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.artisans
    WHERE id = _artisan_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.caminho_e_da_minha_loja(_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _primeiro TEXT;
  _uuid     UUID;
BEGIN
  _primeiro := (storage.foldername(_name))[1];
  IF _primeiro IS NULL THEN
    RETURN FALSE;
  END IF;
  BEGIN
    _uuid := _primeiro::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN FALSE;
  END;
  RETURN private.owns_artisan(_uuid);
END;
$$;

GRANT EXECUTE ON FUNCTION private.is_admin(), private.owns_artisan(uuid),
  private.caminho_e_da_minha_loja(text) TO anon, authenticated, service_role;

-- Invólucros públicos passam a ser SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$ SELECT private.is_admin() $$;

CREATE OR REPLACE FUNCTION public.owns_artisan(_artisan_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$ SELECT private.owns_artisan(_artisan_id) $$;

CREATE OR REPLACE FUNCTION public.caminho_e_da_minha_loja(_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$ SELECT private.caminho_e_da_minha_loja(_name) $$;