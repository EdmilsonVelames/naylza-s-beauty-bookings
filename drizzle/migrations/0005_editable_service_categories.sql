CREATE TABLE public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.service_categories TO authenticated;
GRANT ALL ON public.service_categories TO service_role;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "categories admin insert" ON public.service_categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "categories admin update" ON public.service_categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "categories admin delete" ON public.service_categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.service_categories (name, position) SELECT v.n, v.p FROM (VALUES ('Unhas',1),('Cílios',2),('Sobrancelhas',3)) AS v(n,p);

ALTER TABLE public.services ADD COLUMN category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL;
UPDATE public.services s SET category_id = c.id FROM public.service_categories c
WHERE c.name = CASE s.category WHEN 'unhas' THEN 'Unhas' WHEN 'cilios' THEN 'Cílios' ELSE 'Sobrancelhas' END;
COMMENT ON COLUMN public.services.category IS 'DEPRECATED: replaced by category_id';