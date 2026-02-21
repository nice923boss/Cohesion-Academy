# 凝聚力學院 Cohesion Academy

線上課程學習平台，提供專業課程瀏覽、觀看與管理功能。

## 技術棧

- React 19 + TypeScript
- Vite
- Tailwind CSS 4
- Supabase (資料庫 & 驗證)
- React Router v7

## 本地開發

**前置需求：** Node.js

1. 安裝依賴：
   ```bash
   npm install
   ```
2. 在專案根目錄建立 `.env` 檔案，填入 Supabase 設定：
   ```
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```
3. 啟動開發伺服器：
   ```bash
   npm run dev
   ```

## 部署

本專案使用 GitHub Pages 部署，推送至 `main` 分支後會自動透過 GitHub Actions 建置並部署。
