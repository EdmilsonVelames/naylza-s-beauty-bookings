ALTER TABLE public.services ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;
UPDATE public.services s SET position = r.rn FROM (SELECT id, row_number() OVER (ORDER BY name) rn FROM public.services) r WHERE r.id = s.id;
ALTER TABLE public.client_deposit_overrides ADD COLUMN IF NOT EXISTS percent integer CHECK (percent IS NULL OR (percent BETWEEN 0 AND 100));
CREATE OR REPLACE FUNCTION public.deposit_percent_for(_user_id uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT percent FROM public.client_deposit_overrides WHERE user_id = _user_id), (SELECT deposit_percent FROM public.salon_settings LIMIT 1), 50)
$$;
GRANT EXECUTE ON FUNCTION public.deposit_percent_for(uuid) TO authenticated, service_role;