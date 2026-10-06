CREATE TABLE public.professional_days_on (
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  day date NOT NULL,
  PRIMARY KEY (professional_id, day)
);
GRANT SELECT ON public.professional_days_on TO anon;
GRANT SELECT, INSERT, DELETE ON public.professional_days_on TO authenticated;
GRANT ALL ON public.professional_days_on TO service_role;
ALTER TABLE public.professional_days_on ENABLE ROW LEVEL SECURITY;
CREATE POLICY "days on read" ON public.professional_days_on FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "days on insert" ON public.professional_days_on FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR professional_id = public.professional_id_of(auth.uid()));
CREATE POLICY "days on delete" ON public.professional_days_on FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR professional_id = public.professional_id_of(auth.uid()));

ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS allow_past_closing boolean;

CREATE OR REPLACE FUNCTION public.set_professional_overtime(_professional_id uuid, _value boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR _professional_id = public.professional_id_of(auth.uid())) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  UPDATE public.professionals SET allow_past_closing = _value WHERE id = _professional_id;
END $$;

ALTER TABLE public.salon_settings ADD COLUMN IF NOT EXISTS theme_primary text NOT NULL DEFAULT '';
ALTER TABLE public.salon_settings ADD COLUMN IF NOT EXISTS theme_accent text NOT NULL DEFAULT '';