ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.professional_id_of(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.professionals WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_client_of_professional(_client uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.appointments a JOIN public.professionals p ON p.id = a.professional_id
    WHERE a.user_id = _client AND p.user_id = _user_id)
$$;

CREATE POLICY "professional appointments select" ON public.appointments FOR SELECT TO authenticated
  USING (professional_id = public.professional_id_of(auth.uid()));

CREATE POLICY "professional client profiles select" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_client_of_professional(id, auth.uid()));

CREATE POLICY "professional own blocks write" ON public.blocked_slots FOR ALL TO authenticated
  USING (professional_id = public.professional_id_of(auth.uid()))
  WITH CHECK (professional_id = public.professional_id_of(auth.uid()));