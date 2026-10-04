CREATE TABLE public.professional_services (
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (professional_id, service_id)
);
GRANT SELECT ON public.professional_services TO anon, authenticated;
GRANT INSERT, DELETE ON public.professional_services TO authenticated;
ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prof services public read" ON public.professional_services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "prof services admin insert" ON public.professional_services FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "prof services admin delete" ON public.professional_services FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));