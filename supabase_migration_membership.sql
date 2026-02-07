-- ==============================================
-- VIP 会员系统 (Membership System)
-- 迁移脚本: 创建 user_memberships 表
-- ==============================================

-- 1. 创建会员表
CREATE TABLE IF NOT EXISTS public.user_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 会员类型
    membership_type TEXT NOT NULL DEFAULT 'free',  -- 'free', 'vip'
    
    -- 会员有效期
    starts_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,  -- NULL = 永久有效 (用于测试/赠送)
    
    -- 支付信息 (预留字段)
    payment_provider TEXT,  -- 'stripe', 'alipay', 'wechat'
    payment_id TEXT,        -- 支付平台订单号
    amount_paid DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',  -- 'USD', 'CNY'
    
    -- 自动续费
    auto_renew BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- 约束：同一用户只能有一条会员记录
    CONSTRAINT uniq_user_membership UNIQUE (user_id)
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON public.user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_expires_at ON public.user_memberships(expires_at);

-- 3. 启用 RLS
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own membership"
    ON public.user_memberships FOR SELECT
    USING (auth.uid() = user_id);

-- 4. 创建 Trigger 自动更新 updated_at
DROP TRIGGER IF EXISTS update_user_memberships_updated_at ON public.user_memberships;
CREATE TRIGGER update_user_memberships_updated_at
    BEFORE UPDATE ON public.user_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- 支付记录表 (Payment History)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.payment_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 支付类型
    payment_type TEXT NOT NULL,  -- 'membership_vip', 'credits_recharge'
    
    -- 金额信息
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',  -- 'USD', 'CNY'
    
    -- 充值详情 (针对点数充值)
    credits_amount INTEGER,  -- 充值点数
    
    -- 会员详情 (针对会员订阅)
    membership_days INTEGER,  -- 会员天数
    
    -- 支付平台信息
    payment_provider TEXT,  -- 'stripe', 'alipay', 'wechat'
    payment_id TEXT,        -- 支付平台订单号
    payment_status TEXT DEFAULT 'pending',  -- 'pending', 'completed', 'failed', 'refunded'
    
    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON public.payment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON public.payment_records(payment_status);

-- RLS
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
    ON public.payment_records FOR SELECT
    USING (auth.uid() = user_id);

-- ==============================================
-- 价格配置常量 (供代码参考)
-- ==============================================
-- VIP 月费: $9.99 USD / ¥68 CNY
-- 点数充值: $0.99 USD / ¥6.8 CNY = 10 Credits
-- 
-- VIP 每日额度:
--   analysis: 100
--   oracle: 20
--   compatibility: 30
--
-- 普通用户每日额度:
--   analysis: 10
--   oracle: 1
--   compatibility: 3
