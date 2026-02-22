-- ************************************************************
-- Admin Email Verification Functions
-- 管理員代驗證功能 — 當 Supabase 寄信額度用盡時，
-- 管理員可手動驗證會員 Email，或批次驗證所有未驗證會員
-- ************************************************************

-- 1. 單一會員代驗證
CREATE OR REPLACE FUNCTION public.admin_verify_user(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- 檢查呼叫者是否為管理員
  SELECT role INTO caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RAISE EXCEPTION '權限不足：僅管理員可執行此操作';
  END IF;

  -- 檢查目標使用者是否存在
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION '找不到此使用者';
  END IF;

  -- 更新 email_confirmed_at（僅對尚未驗證的使用者）
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = target_user_id
    AND email_confirmed_at IS NULL;

  RETURN 'OK';
END;
$$;

-- 2. 批次驗證所有未驗證會員
CREATE OR REPLACE FUNCTION public.admin_batch_verify_users()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  verified_count INTEGER;
BEGIN
  -- 檢查呼叫者是否為管理員
  SELECT role INTO caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RAISE EXCEPTION '權限不足：僅管理員可執行此操作';
  END IF;

  -- 批次更新所有未驗證的使用者
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE email_confirmed_at IS NULL;

  GET DIAGNOSTICS verified_count = ROW_COUNT;

  RETURN verified_count;
END;
$$;

-- 3. 查詢所有使用者的驗證狀態
CREATE OR REPLACE FUNCTION public.admin_get_users_verification_status()
RETURNS TABLE(user_id UUID, email_confirmed_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- 檢查呼叫者是否為管理員
  SELECT role INTO caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RAISE EXCEPTION '權限不足：僅管理員可執行此操作';
  END IF;

  RETURN QUERY
  SELECT au.id AS user_id, au.email_confirmed_at
  FROM auth.users au;
END;
$$;

-- ************************************************************
-- 權限設定 — 僅已登入使用者可呼叫（函式內部再驗證 admin 身份）
-- ************************************************************
REVOKE EXECUTE ON FUNCTION public.admin_verify_user(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_batch_verify_users() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_users_verification_status() FROM anon;

GRANT EXECUTE ON FUNCTION public.admin_verify_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_batch_verify_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_users_verification_status() TO authenticated;

-- 通知 PostgREST 重新載入 schema cache
NOTIFY pgrst, 'reload schema';
