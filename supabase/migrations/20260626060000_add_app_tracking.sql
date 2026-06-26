ALTER TABLE public.pan_applications
  ADD COLUMN application_no TEXT UNIQUE,
  ADD COLUMN status_reason TEXT;
