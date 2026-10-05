ALTER TABLE public.salon_settings ADD COLUMN logo_image text NOT NULL DEFAULT '';

ALTER TABLE public.professionals
  ADD COLUMN open_time text,
  ADD COLUMN close_time text,
  ADD COLUMN break_start text,
  ADD COLUMN break_end text;

CREATE TABLE public.professional_days_off (
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  day date NOT NULL,
  PRIMARY KEY (professional_id, day)
);
GRANT SELECT ON public.professional_days_off TO anon, authenticated;
GRANT INSERT, DELETE ON public.professional_days_off TO authenticated;
ALTER TABLE public.professional_days_off ENABLE ROW LEVEL SECURITY;
CREATE POLICY "days off read" ON public.professional_days_off FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "days off write insert" ON public.professional_days_off FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR professional_id = public.professional_id_of(auth.uid()));
CREATE POLICY "days off write delete" ON public.professional_days_off FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR professional_id = public.professional_id_of(auth.uid()));

-- professionals may update their own working hours
CREATE OR REPLACE FUNCTION public.set_professional_hours(_professional_id uuid, _open text, _close text, _bstart text, _bend text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR _professional_id = public.professional_id_of(auth.uid())) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  UPDATE public.professionals
     SET open_time = NULLIF(_open, ''), close_time = NULLIF(_close, ''),
         break_start = NULLIF(_bstart, ''), break_end = NULLIF(_bend, '')
   WHERE id = _professional_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_professional_hours(uuid, text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_professional_hours(uuid, text, text, text, text) TO authenticated;

CREATE POLICY "salon logo public read" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'salon-images' AND name LIKE 'logo/%');