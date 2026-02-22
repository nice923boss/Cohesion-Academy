-- ============================================================
-- Cohesion Academy 資料庫遷移 SQL
-- 將此 SQL 貼入 Supabase SQL Editor 執行
-- ============================================================

-- 1. profiles 表新增欄位
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS donate_url TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';

-- 2. events 表新增日期範圍欄位
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- 3. 建立 articles 文章表
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Articles are viewable by everyone"
  ON articles FOR SELECT USING (true);

CREATE POLICY "Admins can manage articles"
  ON articles FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. 建立 instructor_favorites 收藏講師表
CREATE TABLE IF NOT EXISTS instructor_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, instructor_id)
);

ALTER TABLE instructor_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their instructor favorites"
  ON instructor_favorites FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Instructor favorites are viewable by owner"
  ON instructor_favorites FOR SELECT USING (auth.uid() = user_id);

-- 5. 建立 hidden_instructors 隱藏講師表
CREATE TABLE IF NOT EXISTS hidden_instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, instructor_id)
);

ALTER TABLE hidden_instructors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their hidden instructors"
  ON hidden_instructors FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all hidden instructors"
  ON hidden_instructors FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. 更新 profiles trigger：自動將 email 寫入 profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', '新用戶'),
    'student',
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 確保 trigger 存在（如果已存在會忽略）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. 為既有用戶補填 email（從 auth.users 同步）
UPDATE profiles
SET email = u.email
FROM auth.users u
WHERE profiles.id = u.id AND (profiles.email IS NULL OR profiles.email = '');

-- 8. 新增 site_settings 預設資料（如果不存在）
INSERT INTO site_settings (key, content)
VALUES ('site_donate_url', '{"url": ""}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_settings (key, content)
VALUES ('site_donate_embed', '{"html": ""}')
ON CONFLICT (key) DO NOTHING;

-- 9. courses 表：移除 is_free 欄位的預設值（如果存在的話，不影響既有資料）
-- 注意：如果 is_free 欄位有資料也沒關係，前端已經不再使用此欄位
-- ALTER TABLE courses DROP COLUMN IF EXISTS is_free;
-- 如果需要完全移除 is_free，取消上面那行的註解

-- 10. profiles 表新增 donate_embed 欄位（講師內嵌贊助按鈕 HTML）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS donate_embed TEXT DEFAULT '';

-- 11. 新增跑馬燈訊息預設資料
INSERT INTO site_settings (key, content)
VALUES ('marquee_messages', '{"messages": [{"text": "首頁活動輪播現正開放廣告合作！想讓更多人看見您的品牌嗎？歡迎聯繫網站管理員洽談廣告投放事宜。", "enabled": true}]}')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 執行完畢！請確認所有指令成功執行。
-- ============================================================
