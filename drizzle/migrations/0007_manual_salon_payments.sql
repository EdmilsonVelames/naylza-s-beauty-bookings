CREATE OR REPLACE FUNCTION public.register_manual_payment(_appointment_id uuid, _amount_cents integer, _method text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE a record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF _method NOT IN ('dinheiro','maquininha_credito','maquininha_debito','pix_salao') THEN
    RAISE EXCEPTION 'invalid method';
  END IF;
  SELECT * INTO a FROM public.appointments WHERE id = _appointment_id FOR UPDATE;
  IF NOT FOUND OR a.status = 'cancelled' THEN
    RAISE EXCEPTION 'appointment not found';
  END IF;
  IF _amount_cents <= 0 OR _amount_cents > a.total_cents - a.paid_cents THEN
    RAISE EXCEPTION 'invalid amount';
  END IF;
  INSERT INTO public.payments (appointment_id, user_id, kind, amount_cents, status, provider, payment_method)
  VALUES (a.id, a.user_id, CASE WHEN a.paid_cents = 0 THEN 'deposit' ELSE 'balance' END, _amount_cents, 'approved', 'salao', _method);
  UPDATE public.appointments
    SET paid_cents = a.paid_cents + _amount_cents,
        status = CASE WHEN a.paid_cents + _amount_cents >= a.total_cents THEN 'paid' ELSE 'confirmed' END,
        payment_method = _method
    WHERE id = a.id;
END;
$$;
REVOKE ALL ON FUNCTION public.register_manual_payment(uuid, integer, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.register_manual_payment(uuid, integer, text) TO authenticated;