ALTER TABLE public.salon_settings
  ADD COLUMN IF NOT EXISTS font_body text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS font_display text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS font_scale integer NOT NULL DEFAULT 100;