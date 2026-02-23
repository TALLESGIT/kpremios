-- Create bio_profiles table
CREATE TABLE IF NOT EXISTS public.bio_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    theme_config JSONB DEFAULT '{}'::jsonb,
    custom_links JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT slug_format CHECK (slug ~* '^[a-z0-9_-]+$')
);

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_bio_profiles_slug ON public.bio_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_bio_profiles_user_id ON public.bio_profiles(user_id);

-- Enable RLS on bio_profiles
ALTER TABLE public.bio_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for bio_profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.bio_profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.bio_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own bio profile" ON public.bio_profiles;
CREATE POLICY "Users can insert their own bio profile" ON public.bio_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bio profile" ON public.bio_profiles;
CREATE POLICY "Users can update their own bio profile" ON public.bio_profiles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own bio profile" ON public.bio_profiles;
CREATE POLICY "Users can delete their own bio profile" ON public.bio_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Create user_push_tokens table
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, token)
);

-- Enable RLS on user_push_tokens
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Policies for user_push_tokens
DROP POLICY IF EXISTS "Users can view their own tokens" ON public.user_push_tokens;
CREATE POLICY "Users can view their own tokens" ON public.user_push_tokens
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tokens" ON public.user_push_tokens;
CREATE POLICY "Users can insert their own tokens" ON public.user_push_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tokens" ON public.user_push_tokens;
CREATE POLICY "Users can update their own tokens" ON public.user_push_tokens
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tokens" ON public.user_push_tokens;
CREATE POLICY "Users can delete their own tokens" ON public.user_push_tokens
    FOR DELETE USING (auth.uid() = user_id);
