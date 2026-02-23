-- ============================================================
-- 自動驗證功能：當管理員開啟「註冊免驗證模式」時，
-- 新註冊的會員將自動通過 Email 驗證，無需驗證信。
--
-- 使用方式：在 Supabase SQL Editor 中執行此腳本
-- ============================================================

-- 建立自動驗證函數
-- 此函數會檢查 site_settings 中的 skip_email_verification 設定，
-- 若開啟則自動將指定用戶的 email_confirmed_at 設為當前時間。
CREATE OR REPLACE FUNCTION public.auto_verify_if_enabled(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  setting_content JSONB;
  is_enabled BOOLEAN;
BEGIN
  -- 讀取 skip_email_verification 設定
  SELECT content INTO setting_content
  FROM public.site_settings
  WHERE key = 'skip_email_verification';

  -- 如果設定不存在或未啟用，直接返回 false
  IF setting_content IS NULL THEN
    RETURN false;
  END IF;

  is_enabled := (setting_content->>'enabled')::boolean;

  IF is_enabled = true THEN
    -- 自動驗證用戶
    UPDATE auth.users
    SET email_confirmed_at = NOW()
    WHERE id = target_user_id
      AND email_confirmed_at IS NULL;

    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 授權：允許匿名和已驗證用戶呼叫此函數
-- （因為新註冊用戶在驗證前可能沒有 session）
REVOKE ALL ON FUNCTION public.auto_verify_if_enabled(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_verify_if_enabled(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.auto_verify_if_enabled(UUID) TO authenticated;
