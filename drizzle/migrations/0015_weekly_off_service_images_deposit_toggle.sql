CREATE TABLE public.professional_weekly_off (
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  PRIMARY KEY (professional_id, weekday)
);
GRANT SELECT ON public.professional_weekly_off TO anon;
GRANT SELECT, INSERT, DELETE ON public.professional_weekly_off TO authenticated;
GRANT ALL ON public.professional_weekly_off TO service_role;
ALTER TABLE public.professional_weekly_off ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly off read" ON public.professional_weekly_off FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "weekly off insert" ON public.professional_weekly_off FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR professional_id = public.professional_id_of(auth.uid()));
CREATE POLICY "weekly off delete" ON public.professional_weekly_off FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR professional_id = public.professional_id_of(auth.uid()));

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT '';
ALTER TABLE public.salon_settings ADD COLUMN IF NOT EXISTS deposit_required boolean NOT NULL DEFAULT true;

CREATE TABLE public.client_deposit_overrides (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  required boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_deposit_overrides TO authenticated;
GRANT ALL ON public.client_deposit_overrides TO service_role;
ALTER TABLE public.client_deposit_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff deposit overrides" ON public.client_deposit_overrides FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "own deposit override read" ON public.client_deposit_overrides FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.deposit_required_for(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT required FROM public.client_deposit_overrides WHERE user_id = _user_id),
    (SELECT deposit_required FROM public.salon_settings LIMIT 1),
    true)
$$;

CREATE OR REPLACE FUNCTION public.set_deposit_required(_value boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  UPDATE public.salon_settings SET deposit_required = _value, updated_at = now();
END $$;