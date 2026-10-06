ALTER TABLE public.services ADD COLUMN IF NOT EXISTS package_days integer NOT NULL DEFAULT 30;

ALTER TABLE public.salon_settings
  ADD COLUMN IF NOT EXISTS logo_color text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS theme_light_bg text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS theme_light_fg text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS theme_dark_bg text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS theme_dark_fg text NOT NULL DEFAULT '';

CREATE TABLE public.package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  interval_days integer NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
  UNIQUE (package_service_id, service_id)
);
GRANT SELECT ON public.package_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.package_items TO authenticated;
GRANT ALL ON public.package_items TO service_role;
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "package items read" ON public.package_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "package items admin write" ON public.package_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.client_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  appointment_id uuid UNIQUE REFERENCES public.appointments(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.client_packages TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.client_packages TO authenticated;
GRANT ALL ON public.client_packages TO service_role;
ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own packages read" ON public.client_packages FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "staff packages write" ON public.client_packages FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_package_id uuid REFERENCES public.client_packages(id) ON DELETE SET NULL;

-- Remaining uses of a service inside a client package
CREATE OR REPLACE FUNCTION public.package_remaining(_cp uuid, _service uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT pi.quantity FROM client_packages cp
    JOIN package_items pi ON pi.package_service_id = cp.package_service_id AND pi.service_id = _service
    WHERE cp.id = _cp AND cp.expires_at > now()
  ), 0) - (
    SELECT count(*)::int FROM appointments a
    WHERE a.client_package_id = _cp AND a.service_id = _service AND a.status <> 'cancelled'
  )
$$;

-- Create the client package once a package purchase is confirmed
CREATE OR REPLACE FUNCTION public.create_client_package()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _days integer;
BEGIN
  IF NEW.status NOT IN ('confirmed','paid') THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM package_items WHERE package_service_id = NEW.service_id) THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM client_packages WHERE appointment_id = NEW.id) THEN RETURN NEW; END IF;
  SELECT package_days INTO _days FROM services WHERE id = NEW.service_id;
  INSERT INTO client_packages (user_id, package_service_id, appointment_id, starts_at, expires_at)
  VALUES (NEW.user_id, NEW.service_id, NEW.id, NEW.starts_at, NEW.starts_at + make_interval(days => COALESCE(_days, 30)));
  RETURN NEW;
END $$;

CREATE TRIGGER appointments_create_client_package
AFTER INSERT OR UPDATE OF status ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.create_client_package();