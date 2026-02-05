-- ==============================================
-- Fortune Teller: 用户认证与多档案管理系统
-- Supabase SQL 迁移脚本
-- 执行位置: Supabase Dashboard → SQL Editor
-- ==============================================

-- ==============================================
-- 1. 创建新的 bazi_profiles 表
-- ==============================================
CREATE TABLE IF NOT EXISTS public.bazi_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_name TEXT NOT NULL DEFAULT '我的档案',
    gender TEXT,
    birth_year INTEGER NOT NULL,
    birth_month INTEGER NOT NULL,
    birth_day INTEGER NOT NULL,
    birth_hour TEXT,
    city TEXT,
    is_lunar INTEGER DEFAULT 0,
    session_data JSONB DEFAULT '{}',
    last_divination_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT bazi_profiles_pkey PRIMARY KEY (id),
    -- 同一用户下档案名不能重复
    CONSTRAINT bazi_profiles_unique_name UNIQUE (user_id, profile_name)
);

-- 索引：加速按用户查询
CREATE INDEX IF NOT EXISTS idx_bazi_profiles_user_id ON public.bazi_profiles(user_id);

COMMENT ON TABLE public.bazi_profiles IS '八字档案表，每个用户可以保存多个档案';
COMMENT ON COLUMN public.bazi_profiles.profile_name IS '档案别名，如"我的档案"、"爸爸"、"女朋友"';
COMMENT ON COLUMN public.bazi_profiles.session_data IS '缓存八字排盘结果和AI分析内容';

-- ==============================================
-- 2. RLS (Row Level Security) 策略
-- ==============================================
ALTER TABLE public.bazi_profiles ENABLE ROW LEVEL SECURITY;

-- 用户只能看自己的档案
CREATE POLICY "Users can view own profiles" 
    ON public.bazi_profiles FOR SELECT 
    USING (auth.uid() = user_id);

-- 用户只能插入自己的档案
CREATE POLICY "Users can insert own profiles" 
    ON public.bazi_profiles FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的档案
CREATE POLICY "Users can update own profiles" 
    ON public.bazi_profiles FOR UPDATE 
    USING (auth.uid() = user_id);

-- 用户只能删除自己的档案
CREATE POLICY "Users can delete own profiles" 
    ON public.bazi_profiles FOR DELETE 
    USING (auth.uid() = user_id);

-- ==============================================
-- 3. 自动更新 updated_at 触发器
-- ==============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bazi_profiles_updated_at ON public.bazi_profiles;
CREATE TRIGGER update_bazi_profiles_updated_at
    BEFORE UPDATE ON public.bazi_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- 4. 保留旧 profiles 表并重命名为备份
-- (保留数据，待后续手动关联用户后迁移)
-- ==============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        -- 重命名旧表为备份
        ALTER TABLE public.profiles RENAME TO profiles_backup_20260201;
        RAISE NOTICE '旧表已重命名为 profiles_backup_20260201';
    END IF;
END $$;

-- ==============================================
-- 迁移完成！
-- 
-- 下一步: 
-- 1. 在 Supabase Dashboard → Authentication → Providers 
--    确保 Email 已启用
-- 2. 在 Authentication → Settings → Email Templates
--    自定义验证邮件模板（可选）
-- 3. 在 Authentication → Settings 
--    确认 "Enable email confirmations" 已开启
-- ==============================================
