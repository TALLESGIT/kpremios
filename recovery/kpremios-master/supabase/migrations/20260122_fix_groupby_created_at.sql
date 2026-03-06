-- Fix GROUP BY created_at issue
-- This migration documents the issue and provides guidance

-- The error "column live_streams.created_at must appear in the GROUP BY clause"
-- occurs when a query uses GROUP BY but selects created_at without:
-- 1. Including it in the GROUP BY clause, OR
-- 2. Using an aggregate function (MAX, MIN, etc)

-- SOLUTION:
-- If you're using GROUP BY with live_streams and need created_at:
-- Option 1: Include created_at in GROUP BY
--   SELECT id, created_at FROM live_streams GROUP BY id, created_at
--
-- Option 2: Use aggregate function
--   SELECT id, MAX(created_at) as created_at FROM live_streams GROUP BY id

-- This error typically occurs in:
-- 1. RPC functions that use GROUP BY
-- 2. Direct SQL queries (not via PostgREST)
-- 3. Views that aggregate data

-- Check Supabase logs to identify which query is failing
-- Then fix that specific query using one of the options above

COMMENT ON COLUMN live_streams.created_at IS 
  'Data de criação da transmissão. Ao usar GROUP BY, inclua esta coluna no GROUP BY ou use uma função de agregação (MAX, MIN, etc).';
