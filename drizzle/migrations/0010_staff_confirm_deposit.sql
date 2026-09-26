CREATE OR REPLACE FUNCTION public.confirm_deposit_manual(_appointment_id uuid, _method text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record; pct int; amt int;
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = _appointment_id FOR UPDATE;
  IF a IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF NOT (public.has_role(auth.uid(), 'admin') OR a.professional_id = public.professional_id_of(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _method NOT IN ('dinheiro','maquininha_credito','maquininha_debito','pix_salao') THEN RAISE EXCEPTION 'invalid method'; END IF;
  IF a.status <> 'pending' THEN RAISE EXCEPTION 'already confirmed'; END IF;
  SELECT deposit_percent INTO pct FROM public.salon_settings LIMIT 1;
  amt := round(a.total_cents * coalesce(pct, 50) / 100.0);
  INSERT INTO public.payments (appointment_id, user_id, kind, amount_cents, status, provider, payment_method)
  VALUES (a.id, a.user_id, 'deposit', amt, 'approved', 'salao', _method);
  UPDATE public.appointments SET paid_cents = amt, status = CASE WHEN amt >= total_cents THEN 'paid' ELSE 'confirmed' END, payment_method = _method WHERE id = a.id;
END $$;
GRANT EXECUTE ON FUNCTION public.confirm_deposit_manual(uuid, text) TO authenticated;