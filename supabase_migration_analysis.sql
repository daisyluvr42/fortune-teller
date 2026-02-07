
-- ==============================================
-- 7. 深度分析信用额度（analysis_credits）
-- ==============================================
CREATE TABLE IF NOT EXISTS public.analysis_credits (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_limit INTEGER NOT NULL DEFAULT 10, -- 默认每日10次
    daily_used INTEGER NOT NULL DEFAULT 0,
    extra_credits INTEGER NOT NULL DEFAULT 0,
    last_reset_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT analysis_credits_pkey PRIMARY KEY (user_id)
);

CREATE INDEX IF NOT EXISTS idx_analysis_credits_user_id ON public.analysis_credits(user_id);

ALTER TABLE public.analysis_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analysis credits"
    ON public.analysis_credits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis credits"
    ON public.analysis_credits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis credits"
    ON public.analysis_credits FOR UPDATE
    USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_analysis_credits_updated_at ON public.analysis_credits;
CREATE TRIGGER update_analysis_credits_updated_at
    BEFORE UPDATE ON public.analysis_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
