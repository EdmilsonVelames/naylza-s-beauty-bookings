CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rooms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms public read" ON public.rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rooms admin write" ON public.rooms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.salon_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  deposit_percent INTEGER NOT NULL DEFAULT 50,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT salon_settings_singleton CHECK (id),
  CONSTRAINT salon_settings_percent_range CHECK (deposit_percent BETWEEN 0 AND 100)
);

GRANT SELECT ON public.salon_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.salon_settings TO authenticated;
GRANT ALL ON public.salon_settings TO service_role;

ALTER TABLE public.salon_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings public read" ON public.salon_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings admin write" ON public.salon_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.salon_settings (id, deposit_percent) VALUES (true, 50) ON CONFLICT (id) DO NOTHING;
