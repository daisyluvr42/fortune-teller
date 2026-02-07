-- ==============================================
-- 清理旧 Credit 表（可选）
-- 执行前请确保 user_quotas 数据已迁移成功
-- ==============================================

-- 1. 备份旧表（推荐先执行此步骤）
ALTER TABLE IF EXISTS public.oracle_credits RENAME TO oracle_credits_backup_20260206;
ALTER TABLE IF EXISTS public.compatibility_credits RENAME TO compatibility_credits_backup_20260206;

-- 2.（可选）如果确认不需要备份，直接删除
-- DROP TABLE IF EXISTS public.oracle_credits;
-- DROP TABLE IF EXISTS public.compatibility_credits;

-- 注意：备份表会保留数据，但不再被应用使用
-- 可在确认系统稳定运行一段时间后手动删除备份表
