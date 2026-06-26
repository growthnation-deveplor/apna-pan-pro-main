
CREATE POLICY "Public can upload pan documents"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'pan-documents');
