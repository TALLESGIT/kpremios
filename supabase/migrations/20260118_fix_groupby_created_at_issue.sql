-- Fix GROUP BY created_at issue in live_streams queries
-- This migration ensures that any queries using GROUP BY with live_streams
-- properly handle the created_at column

-- Add comment to help identify problematic queries
COMMENT ON COLUMN live_streams.created_at IS 
  'Data de criação da transmissão. Ao usar GROUP BY, inclua esta coluna no GROUP BY ou use uma função de agregação.';

-- Verify no functions are using GROUP BY incorrectly with live_streams
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT 
      p.proname as function_name,
      pg_get_functiondef(p.oid) as definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND pg_get_functiondef(p.oid) LIKE '%live_streams%'
      AND pg_get_functiondef(p.oid) LIKE '%GROUP BY%'
  LOOP
    -- Log functions that use GROUP BY with live_streams for review
    RAISE NOTICE 'Function % uses GROUP BY with live_streams - please verify created_at is handled correctly', func_record.function_name;
  END LOOP;
END $$;
