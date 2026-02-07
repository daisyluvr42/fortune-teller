-- ==============================================
-- 统一权益管理系统 (Unified Credit System)
-- 迁移脚本: 创建 user_quotas 表并迁移数据
-- ==============================================

-- 1. 创建 user_quotas 表
CREATE TABLE IF NOT EXISTS public.user_quotas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,  -- 'oracle', 'compatibility', 'analysis'
    
    -- 周期性权益 (Free Tier)
    cycle_type TEXT DEFAULT 'daily', -- 'daily', 'monthly', 'none'
    cycle_limit INTEGER DEFAULT 0,   -- 周期内免费额度
    cycle_used INTEGER DEFAULT 0,    -- 周期内已用次数
    last_reset_date DATE DEFAULT CURRENT_DATE, -- 上次重置时间
    
    -- 充值权益 (Paid Tier)
    extra_balance INTEGER DEFAULT 0, -- 充值/赠送的额外点数 (永不过期)
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- 约束：同一用户同一功能只能有一条记录
    CONSTRAINT uniq_user_feature UNIQUE (user_id, feature_key)
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_user_quotas_user_id ON public.user_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quotas_feature_key ON public.user_quotas(feature_key);

-- 3. 启用 RLS
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quotas"
    ON public.user_quotas FOR SELECT
    USING (auth.uid() = user_id);

-- 4. 数据迁移 (Migration)

-- 4.1 迁移 Oracle 数据 (Daily Limit)
INSERT INTO public.user_quotas (user_id, feature_key, cycle_type, cycle_limit, cycle_used, extra_balance, last_reset_date)
SELECT 
    user_id, 
    'oracle', 
    'daily', 
    daily_limit, 
    daily_used, 
    extra_credits, 
    COALESCE(last_reset_date, CURRENT_DATE)
FROM public.oracle_credits
ON CONFLICT (user_id, feature_key) DO UPDATE SET
    cycle_limit = EXCLUDED.cycle_limit,
    cycle_used = EXCLUDED.cycle_used,
    extra_balance = EXCLUDED.extra_balance,
    last_reset_date = EXCLUDED.last_reset_date;

-- 4.2 迁移 Compatibility 数据 (Total Limit / Lifetime)
-- 合盘目前是"赠送3次"，不重置。我们可以将其视为 cycle_type='none' (终身限额)，或者 'daily' 但 limit=0 (纯消耗)。
-- 根据之前的逻辑 "Total Credits = 3"，把它映射为 cycle_limit=3, cycle_type='none' 最合适。
INSERT INTO public.user_quotas (user_id, feature_key, cycle_type, cycle_limit, cycle_used, extra_balance)
SELECT 
    user_id, 
    'compatibility', 
    'none',         -- 不复位
    total_credits,  -- 总赠送量
    used_credits,   -- 已使用量
    extra_credits
FROM public.compatibility_credits
ON CONFLICT (user_id, feature_key) DO UPDATE SET
    cycle_limit = EXCLUDED.cycle_limit,
    cycle_used = EXCLUDED.cycle_used,
    extra_balance = EXCLUDED.extra_balance;

-- 5. 添加 Analysis 的默认配置 (不必迁移，因为是新功能，只需告知后端默认值即可)
-- (注：后端逻辑会在用户首次调用时插入默认记录：Daily Limit = 10)

-- 6. 创建 Trigger 自动更新 updated_at
DROP TRIGGER IF EXISTS update_user_quotas_updated_at ON public.user_quotas;
CREATE TRIGGER update_user_quotas_updated_at
    BEFORE UPDATE ON public.user_quotas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. (可选) 备份旧表
-- ALTER TABLE public.oracle_credits RENAME TO oracle_credits_backup_20260206;
-- ALTER TABLE public.compatibility_credits RENAME TO compatibility_credits_backup_20260206;
