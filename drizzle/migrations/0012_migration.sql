CREATE TABLE public.service_formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name text NOT NULL,
  image_url text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_formats TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.service_formats TO authenticated;
ALTER TABLE public.service_formats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "formats public read" ON public.service_formats FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "formats admin insert" ON public.service_formats FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "formats admin update" ON public.service_formats FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "formats admin delete" ON public.service_formats FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.service_categories ADD COLUMN image_url text NOT NULL DEFAULT '';
ALTER TABLE public.appointments ADD COLUMN format_name text NOT NULL DEFAULT '';

INSERT INTO public.service_formats (service_id, name, position)
VALUES ('fe048ffa-e79a-42c3-9610-0b75b57b946c', 'Ballerina', 1);

CREATE POLICY "salon images read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'salon-images');
CREATE POLICY "salon images admin insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'salon-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "salon images admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'salon-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "salon images admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'salon-images' AND public.has_role(auth.uid(), 'admin'));