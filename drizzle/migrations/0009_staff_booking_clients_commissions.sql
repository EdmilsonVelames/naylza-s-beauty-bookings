CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (SELECT 1 FROM public.professionals WHERE user_id = _user_id)
$$;

ALTER TABLE public.appointments ADD COLUMN guest_name text NOT NULL DEFAULT '';
ALTER TABLE public.appointments ADD COLUMN guest_phone text NOT NULL DEFAULT '';
ALTER TABLE public.appointments ADD COLUMN created_by uuid;

ALTER TABLE public.professionals ADD COLUMN commission_percent integer NOT NULL DEFAULT 40;

CREATE TABLE public.client_notes (
  client_key text PRIMARY KEY,
  phone text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_notes TO authenticated;
GRANT ALL ON public.client_notes TO service_role;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff client notes" ON public.client_notes FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "staff appointments select" ON public.appointments FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff appointments insert" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff profiles select" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff profiles update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()));