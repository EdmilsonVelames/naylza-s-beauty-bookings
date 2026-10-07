ALTER TABLE public.client_packages ADD COLUMN IF NOT EXISTS quantities jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.package_remaining(_cp uuid, _service uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT COALESCE((cp.quantities ->> _service::text)::int, pi.quantity)
    FROM client_packages cp
    JOIN package_items pi ON pi.package_service_id = cp.package_service_id AND pi.service_id = _service
    WHERE cp.id = _cp AND cp.expires_at > now()
  ), 0) - (
    SELECT count(*)::int FROM appointments a
    WHERE a.client_package_id = _cp AND a.service_id = _service AND a.status <> 'cancelled'
  )
$$;