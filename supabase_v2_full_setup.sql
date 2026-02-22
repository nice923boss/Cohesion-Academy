-- ============================================================
-- 凝聚力學院 Cohesion Academy V2.0 — 完整資料庫建置
-- 使用方式：在 Supabase SQL Editor 中貼上並執行此完整腳本
-- 注意：請先在 Supabase Dashboard 執行「清除所有舊資料表和相關物件」
-- ============================================================

-- ************************************************************
-- 1. PROFILES — 使用者資料表
-- ************************************************************
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '新用戶',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  email TEXT DEFAULT '',
  donate_url TEXT DEFAULT '',
  donate_embed TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile."
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile."
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile."
  ON profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ************************************************************
-- 2. COURSES — 課程資料表
-- ************************************************************
CREATE TABLE courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  category TEXT DEFAULT '',
  instructor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  views INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published courses are viewable by everyone."
  ON courses FOR SELECT USING (
    is_published = true
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'instructor'))
  );

CREATE POLICY "Instructors can insert own courses."
  ON courses FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'instructor'))
  );

CREATE POLICY "Instructors can update own courses."
  ON courses FOR UPDATE USING (
    instructor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Instructors can delete own courses."
  ON courses FOR DELETE USING (
    instructor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ************************************************************
-- 3. UNITS — 課程單元（影片 + 測驗）
-- ************************************************************
CREATE TABLE units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  quiz_data JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Units are viewable by everyone."
  ON units FOR SELECT USING (true);

CREATE POLICY "Instructors and admins can manage units."
  ON units FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'instructor'))
  );

-- ************************************************************
-- 4. EVENTS — 首頁活動輪播
-- ************************************************************
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone."
  ON events FOR SELECT USING (true);

CREATE POLICY "Admins can manage events."
  ON events FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ************************************************************
-- 5. ARTICLES — 最新文章（僅管理員可發佈）
-- ************************************************************
CREATE TABLE articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published articles are viewable by everyone."
  ON articles FOR SELECT USING (true);

CREATE POLICY "Admins can manage articles."
  ON articles FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ************************************************************
-- 6. INVITATION_CODES — 講師 / 管理員邀請碼
-- ************************************************************
CREATE TABLE invitation_codes (
  code TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('instructor', 'admin')),
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitation codes."
  ON invitation_codes FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authenticated users can view codes for validation."
  ON invitation_codes FOR SELECT USING (auth.role() = 'authenticated');

-- ************************************************************
-- 7. USER_FAVORITES — 使用者收藏課程
-- ************************************************************
CREATE TABLE user_favorites (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, course_id)
);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites."
  ON user_favorites FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites."
  ON user_favorites FOR ALL USING (auth.uid() = user_id);

-- ************************************************************
-- 8. INSTRUCTOR_FAVORITES — 收藏講師
-- ************************************************************
CREATE TABLE instructor_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, instructor_id)
);

ALTER TABLE instructor_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their instructor favorites."
  ON instructor_favorites FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own instructor favorites."
  ON instructor_favorites FOR SELECT USING (auth.uid() = user_id);

-- ************************************************************
-- 9. HIDDEN_INSTRUCTORS — 隱藏講師
-- ************************************************************
CREATE TABLE hidden_instructors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, instructor_id)
);

ALTER TABLE hidden_instructors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their hidden instructors."
  ON hidden_instructors FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all hidden instructors."
  ON hidden_instructors FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ************************************************************
-- 10. SITE_SETTINGS — 網站設定（CMS 可編輯內容）
-- ************************************************************
CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings are viewable by everyone."
  ON site_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage site settings."
  ON site_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ************************************************************
-- 11. TRIGGER — 新使用者註冊時自動建立 Profile
-- ************************************************************
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ************************************************************
-- 12. 預設網站設定資料
-- ************************************************************

-- 關於我們
INSERT INTO site_settings (key, content) VALUES
('about', '{
  "title": "關於凝聚力學院",
  "body": "",
  "body_html": "<p>感謝每一位支持凝聚力學院的夥伴們！</p><p>凝聚力學院 (Cohesion Academy) 是一個以<strong>共創與分享</strong>為核心精神的免費知識共享平台。我們深信，知識的價值在於流動與傳遞，而非囤積與封閉。</p><p>在這裡，每位有專業知識與實務經驗的人，都可以成為講師，免費上架自己的課程，與更多人分享自己的專業。學員們可以透過 Donate 贊助機制，自由地支持認同的講師，讓知識分享成為一個良性循環。</p><p>我們不從講師的收入中抽取任何費用，凝聚力學院的營運經費來自首頁活動輪播的廣告收入，而這些收入將全數用於舉辦實體免費活動，培訓更多有熱情的分享者成為講師，型塑屬於自己的自媒體品牌。</p><p>感謝您的每一次點擊、每一次分享、每一份贊助。正是因為有您的支持，凝聚力學院才能持續成長，讓學習真正沒有門檻。</p><p><em>— 凝聚力學院團隊</em></p>"
}');

-- 服務條款
INSERT INTO site_settings (key, content) VALUES
('terms', '{
  "title": "凝聚力學院 服務條款",
  "sections": [
    {
      "title": "1. 平台簡介與服務說明",
      "content": "<p>凝聚力學院 (Cohesion Academy) 是一個<strong>完全免費</strong>的線上知識共享平台。所有課程內容均免費開放給已註冊的會員觀看，平台不收取任何課程費用或會員訂閱費。</p><p>本平台提供以下服務：</p><ul><li>免費線上課程觀看（需註冊會員）</li><li>講師免費上架個人原創課程</li><li>Donate 贊助連結功能（由講師自行設定收款方式）</li><li>課程收藏與講師追蹤功能</li></ul>"
    },
    {
      "title": "2. 帳號註冊與使用",
      "content": "<p>使用者須註冊帳號方可觀看課程內容。註冊時請提供真實有效的電子郵件地址，並妥善保管帳號密碼。</p><p>嚴禁將帳號借予他人使用。若發現帳號遭到盜用，請立即聯繫管理員處理。</p>"
    },
    {
      "title": "3. 講師規範與原創內容聲明",
      "content": "<p><strong>講師上架的所有課程內容，必須為講師本人原創製作，或已取得合法授權的內容。</strong></p><p>嚴禁以下行為：</p><ul><li>轉發、搬運或重新上傳他人的影片、文章或作品作為課程內容</li><li>未經授權使用他人的智慧財產權內容</li><li>冒用他人名義或身份上架課程</li></ul><p><strong>違反上述規定者，管理員有權立即取消其講師資格並下架所有違規課程，且不另行通知。</strong></p>"
    },
    {
      "title": "4. Donate 贊助機制說明",
      "content": "<p>凝聚力學院提供 Donate 贊助連結功能，讓學員可以自由贊助支持講師。此機制的重要說明如下：</p><ul><li>贊助行為完全出於學員自願，平台不強制任何贊助</li><li>講師自行設定並管理自己的收款方式與連結</li><li><strong>凝聚力學院不從講師的贊助收入中抽取任何費用或佣金</strong></li><li>贊助行為屬於講師與學員之間的直接交易，平台不介入處理相關糾紛</li></ul>"
    },
    {
      "title": "5. 平台營運與廣告政策",
      "content": "<p>凝聚力學院的營運經費來源為首頁活動輪播的廣告收入。如有廣告投放需求，歡迎聯繫網站管理員洽談合作。</p><p>廣告收入的用途：</p><ul><li>維持平台伺服器與技術維運</li><li>舉辦實體免費活動與講師培訓</li><li>培訓更多分享者成為講師，推廣自媒體教育</li></ul>"
    },
    {
      "title": "6. 隱私權保護",
      "content": "<p>凝聚力學院重視您的個人隱私。我們僅收集註冊所需的基本資訊（姓名、電子郵件），並承諾不會將您的個人資料出售或分享給第三方。</p><p>您的學習紀錄、收藏清單、隱藏講師設定等個人偏好資料，僅供您個人使用，管理員可基於平台品質管理需求進行統計分析。</p>"
    },
    {
      "title": "7. 免責聲明",
      "content": "<p>凝聚力學院作為課程分享平台，不對個別講師的課程內容品質、正確性或完整性做出保證。學員應自行判斷課程內容的適用性。</p><p>對於因使用本平台服務而產生的任何直接或間接損失，凝聚力學院不承擔責任。</p>"
    },
    {
      "title": "8. 條款修改",
      "content": "<p>凝聚力學院保留隨時修改本服務條款的權利。修改後的條款將公布於本頁面，繼續使用本平台即視為同意修改後的條款。</p><p>最後更新日期：2026 年 2 月</p>"
    }
  ]
}');

-- 聯繫我們
INSERT INTO site_settings (key, content) VALUES
('contact', '{
  "title": "聯繫我們",
  "email": "support@cohesion.edu",
  "email_url": "mailto:support@cohesion.edu",
  "line_id": "3YAya5KQYr",
  "line_url": "https://line.me/ti/p/3YAya5KQYr",
  "address": "台北市信義區忠孝東路五段",
  "address_url": ""
}');

-- Discord / 課程交流連結
INSERT INTO site_settings (key, content) VALUES
('discord_url', '"https://discord.com"');

-- 網站贊助連結
INSERT INTO site_settings (key, content) VALUES
('site_donate_url', '{"url": ""}');

-- 網站贊助內嵌 HTML
INSERT INTO site_settings (key, content) VALUES
('site_donate_embed', '{"html": ""}');

-- 跑馬燈訊息（支援多條、含日期範圍）
INSERT INTO site_settings (key, content) VALUES
('marquee_messages', '{
  "messages": [
    {
      "text": "歡迎來到凝聚力學院！所有課程完全免費，註冊會員即可觀看。",
      "enabled": true,
      "start_date": "",
      "end_date": ""
    },
    {
      "text": "首頁活動輪播現正開放廣告合作！想讓更多人看見您的品牌嗎？歡迎聯繫網站管理員洽談廣告投放事宜。",
      "enabled": true,
      "start_date": "",
      "end_date": ""
    },
    {
      "text": "您也是專業人士嗎？歡迎免費上架您的課程，透過 Donate 連結讓學員自由贊助支持您！",
      "enabled": true,
      "start_date": "",
      "end_date": ""
    }
  ]
}');

-- ============================================================
-- 建置完成！
-- 請確認所有指令成功執行後，回到應用程式進行驗證。
-- ============================================================
