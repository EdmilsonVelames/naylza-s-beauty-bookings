ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_message_id text,
  ADD COLUMN IF NOT EXISTS reminder_error text;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;