ALTER TABLE public.service_categories ADD COLUMN hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.salon_settings ADD COLUMN logo_icon text NOT NULL DEFAULT 'scissors';