-- ============================================================
-- 凝聚力學院 — 修復 courses 資料表 RLS 政策 + 外鍵約束
-- 用途：解決「課程發佈後無法在首頁/所有課程顯示」的問題
-- 使用方式：在 Supabase Dashboard → SQL Editor 中貼上並執行
-- ============================================================

-- ************************************************************
-- A. 修復外鍵約束（讓 PostgREST JOIN 查詢正常運作）
-- ************************************************************

-- 如果 courses.instructor_id 缺少外鍵，補上
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'courses'
      AND constraint_name LIKE '%instructor_id%'
  ) THEN
    ALTER TABLE courses
      ADD CONSTRAINT courses_instructor_id_fkey
      FOREIGN KEY (instructor_id) REFERENCES profiles(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added FK: courses.instructor_id -> profiles.id';
  ELSE
    RAISE NOTICE 'FK already exists for courses.instructor_id';
  END IF;
END $$;

-- 如果 articles.author_id 缺少外鍵，補上
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'articles'
      AND constraint_name LIKE '%author_id%'
  ) THEN
    ALTER TABLE articles
      ADD CONSTRAINT articles_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added FK: articles.author_id -> profiles.id';
  ELSE
    RAISE NOTICE 'FK already exists for articles.author_id';
  END IF;
END $$;

-- 通知 PostgREST 重新載入 schema cache
NOTIFY pgrst, 'reload schema';

-- ************************************************************
-- B. 修復 RLS 政策
-- ************************************************************

-- 步驟 1：刪除所有 courses 表上的舊 RLS 政策
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'courses' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON courses', pol.policyname);
  END LOOP;
END $$;

-- 步驟 2：確認 RLS 已開啟
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- 步驟 3：重新建立正確的 RLS 政策

-- SELECT：已發佈的課程所有人都能看；講師/管理員可以看到未發佈的
CREATE POLICY "Published courses are viewable by everyone."
  ON courses FOR SELECT USING (
    is_published = true
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'instructor'))
  );

-- INSERT：僅 instructor 或 admin 可新增課程
CREATE POLICY "Instructors can insert own courses."
  ON courses FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'instructor'))
  );

-- UPDATE：講師可更新自己的課程，管理員可更新所有課程
CREATE POLICY "Instructors can update own courses."
  ON courses FOR UPDATE USING (
    instructor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- DELETE：講師可刪除自己的課程，管理員可刪除所有課程
CREATE POLICY "Instructors can delete own courses."
  ON courses FOR DELETE USING (
    instructor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ************************************************************
-- C. 驗證結果
-- ************************************************************

-- 查看外鍵約束
SELECT conname AS constraint_name, conrelid::regclass AS table_name
FROM pg_constraint
WHERE contype = 'f' AND conrelid IN ('courses'::regclass, 'articles'::regclass);

-- 查看課程發佈狀態
SELECT id, title, is_published, instructor_id, created_at
FROM courses
ORDER BY created_at DESC;

-- ============================================================
-- 完成！執行後請確認：
-- 1. 上方顯示外鍵約束已存在
-- 2. 課程的 is_published 為 true
-- 3. 回到網站首頁刷新（Ctrl+Shift+R），確認課程出現
-- ============================================================
