ALTER TABLE public.salon_settings
  ADD COLUMN IF NOT EXISTS open_time TEXT NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS close_time TEXT NOT NULL DEFAULT '19:00',
  ADD COLUMN IF NOT EXISTS slot_minutes INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS break_start TEXT NOT NULL DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS break_end TEXT NOT NULL DEFAULT '13:00';

CREATE UNIQUE INDEX IF NOT EXISTS appointments_unique_active_slot
  ON public.appointments (professional_id, starts_at)
  WHERE status <> 'cancelled';