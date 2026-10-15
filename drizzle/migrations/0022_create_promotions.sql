CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  badge_text text NOT NULL DEFAULT 'Promoção',
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed','price')),
  discount_value integer NOT NULL DEFAULT 10 CHECK (discount_value >= 0),
  service_ids uuid[] NOT NULL DEFAULT '{}',
  starts_on date,
  ends_on date,
  weekdays integer[] NOT NULL DEFAULT '{}',
  start_time text,
  end_time text,
  color text NOT NULL DEFAULT '',
  show_banner boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads promotions" ON public.promotions FOR SELECT USING (true);
CREATE POLICY "Admins manage promotions" ON public.promotions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));