-- 1. 建立 Profiles 資料表 (使用者資訊)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
  subscription_start TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 建立 Courses 資料表 (課程)
CREATE TABLE courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT,
  instructor_id UUID REFERENCES profiles(id),
  views INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  is_free BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 建立 Units 資料表 (課程單元)
CREATE TABLE units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  quiz_data JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 建立 Events 資料表 (首頁活動輪播)
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 建立 Invitation Codes 資料表 (講師/管理員邀請碼)
CREATE TABLE invitation_codes (
  code TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('instructor', 'admin')),
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 建立 User Favorites 資料表 (使用者收藏課程)
CREATE TABLE user_favorites (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, course_id)
);

-- 7. 建立 Site Settings 資料表 (儲存關於我們、條款等內容)
CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入預設內容
INSERT INTO site_settings (key, content) VALUES 
('about', '{"title": "關於凝聚力學院", "body": "凝聚力學院 (Cohesion Academy) 致力於打造最高端的線上學習體驗。我們相信，知識的傳遞不應只是單向的灌輸，而是一場充滿美感與啟發的旅程。\n\n我們的課程涵蓋專業技術、設計美學與商業策略，由各領域頂尖導師親自授課。透過精心設計的影音內容與互動測驗，幫助學員在最短的時間內掌握核心技能。\n\n在這裡，我們不只教導知識，更引領您走向卓越。"}'),
('terms', '{"title": "服務條款", "sections": [{"title": "1. 服務說明", "content": "凝聚力學院提供線上課程訂閱與單次購買服務。使用者在付費後可於有效期限內觀看對應內容。"}, {"title": "2. 帳號安全", "content": "使用者須妥善保管帳號密碼，不得將帳號借予他人使用。若發現帳號遭盜用，請立即聯繫管理員。"}, {"title": "3. 退款政策", "content": "由於數位內容之特殊性，課程一經購買或開通權限後，恕不接受退款申請。請於購買前詳閱課程介紹。"}]}'),
('contact', '{"title": "聯繫我們", "email": "support@cohesion.edu", "email_url": "mailto:support@cohesion.edu", "line_id": "3YAya5KQYr", "line_url": "https://line.me/ti/p/3YAya5KQYr", "address": "台北市信義區忠孝東路五段", "address_url": ""}'),
('discord_url', '"https://discord.com"'),
('membership_steps', '{"title": "購買年費會員", "subtitle": "請依照以下步驟開通權限：", "steps_rich": "", "line_url": "https://line.me/ti/p/3YAya5KQYr", "button_text": "立即聯繫管理員"}');

-- 啟用 Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- 設定 RLS 策略 (Policies)

-- Site Settings: 所有人可讀取，僅限管理員修改
CREATE POLICY "Site settings are viewable by everyone." ON site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage site settings." ON site_settings FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Profiles: 使用者可以讀取所有 Profile，但只能修改自己的
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Courses: 所有人可讀取已發佈課程，管理員與講師可讀取所有
CREATE POLICY "Published courses are viewable by everyone." ON courses FOR SELECT USING (is_published = true OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'instructor'));
CREATE POLICY "Admins and instructors can manage courses." ON courses FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'instructor'));

-- Units: 所有人可讀取單元
CREATE POLICY "Units are viewable by everyone." ON units FOR SELECT USING (true);
CREATE POLICY "Admins and instructors can manage units." ON units FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'instructor'));

-- Events: 所有人可讀取活動
CREATE POLICY "Events are viewable by everyone." ON events FOR SELECT USING (true);
CREATE POLICY "Admins can manage events." ON events FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Invitation Codes: 僅限管理員管理，登入使用者可讀取 (用於驗證)
CREATE POLICY "Admins can manage invitation codes." ON invitation_codes FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Authenticated users can view codes." ON invitation_codes FOR SELECT USING (auth.role() = 'authenticated');

-- User Favorites: 使用者可以管理自己的收藏
CREATE POLICY "Users can view own favorites." ON user_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own favorites." ON user_favorites FOR ALL USING (auth.uid() = user_id);

-- 自動建立 Profile 的 Trigger (當 Auth.Users 有新註冊時)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'student');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
