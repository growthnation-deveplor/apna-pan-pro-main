
CREATE TABLE public.pan_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_mobile TEXT NOT NULL,
  customer_mobile TEXT NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  father_name TEXT NOT NULL,
  mother_name TEXT NOT NULL,
  village TEXT NOT NULL,
  post_office TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  pin_code TEXT NOT NULL,
  aadhaar_url TEXT NOT NULL,
  dob_proof_url TEXT,
  photo_url TEXT NOT NULL,
  signature_url TEXT NOT NULL,
  payment_screenshot_url TEXT NOT NULL,
  submission_status TEXT NOT NULL DEFAULT 'pending',
  sheet_synced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.pan_applications TO anon;
GRANT INSERT ON public.pan_applications TO authenticated;
GRANT ALL ON public.pan_applications TO service_role;

ALTER TABLE public.pan_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an application"
  ON public.pan_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
