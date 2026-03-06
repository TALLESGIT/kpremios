-- Function to increment advertisement clicks
CREATE OR REPLACE FUNCTION increment_advertisement_clicks(ad_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE advertisements
  SET click_count = COALESCE(click_count, 0) + 1,
      updated_at = NOW()
  WHERE id = ad_id;
END;
$$;
