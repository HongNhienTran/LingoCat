# 🐾 LingoCat — Action-Based Vocabulary Learning Platform

> **LingoCat** là nền tảng game học từ vựng tiếng Anh tương tác cao, xây dựng bằng **Next.js 15 (App Router)** và khai thác triệt để hệ sinh thái **Supabase (Free Tier)**.  
> Dự án được tạo ra với mục tiêu thực hành: **cào dữ liệu từ vựng thực tế (Data Scraping & Ingestion Pipeline)**, thiết kế Game hành động 60 FPS, và ứng dụng tối đa các công nghệ chuyên sâu của Supabase (Postgres, RLS, Database Triggers, Storage, Realtime, `pgvector`).

---

## 🎯 Mục Tiêu & Triết Lý Cốt Lõi

1. **Học qua Game hành động 100% (Action-Based Learning)**:
   - Hoàn toàn **KHÔNG** sử dụng Flashcard thụ động.
   - Người học tiếp thu và phản xạ từ vựng qua cơ chế bắn thiên thạch, gõ phím tốc độ, chọn đạn mục tiêu và nghe phát âm chuẩn bản xứ ngay trong nhịp đấu 60 FPS.
2. **Pipeline Nạp Dữ Liệu Cào Hàng Loạt (Scraped Data Pipeline)**:
   - Tự động nạp từ vựng từ các file cào JSON/CSV.
   - Tự động gom nhóm theo chủ đề (Topics -> Decks), chuẩn hóa phiên âm IPA và tự sinh 3 đáp án bẫy (*Distractors*) thông minh.
3. **Khai thác Tối đa Hệ sinh thái Supabase**:
   - **Postgres DB + RLS**: Phân quyền dữ liệu người dùng tuyệt đối.
   - **Triggers & PL/pgSQL**: Tự động tính XP, thăng cấp Level và chuỗi Streak học tập khi kết thúc ván đấu.
   - **`pgvector` (Vector Database)**: Tìm kiếm tương đồng ngữ nghĩa và sinh câu hỏi trắc nghiệm bẫy có chiều sâu.
   - **Supabase Storage**: Quản lý âm thanh phát âm và avatar.
   - **Supabase Realtime**: Đấu trường 1v1 PvP & Bảng xếp hạng trực tiếp.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

- **Frontend**: Next.js 15 (Turbopack, App Router) + TypeScript + Tailwind CSS.
- **Game Engine**: HTML5 Canvas 2D (60 FPS physics loop, particle effects, screen shake).
- **Audio Engine**: Procedural Web Audio API Synthesizer (tổng hợp âm thanh laser, combo, nổ bằng sóng âm thuần) + Web Speech API (TTS chuẩn bản xứ).
- **State Management**: Zustand.
- **Backend & Database**: Supabase (PostgreSQL 15, Auth, RLS, Storage, Triggers, `pgvector`).
- **Database Best Practices**: Theo chuẩn chính thức `supabase-postgres-best-practices`.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy (Quickstart)

### 1. Clone source code và cài đặt dependencies
```bash
git clone https://github.com/HongNhienTran/LingoCat.git
cd LingoCat
npm install
```

### 2. Cấu hình Supabase Database
1. Mở [Supabase Dashboard](https://supabase.com/dashboard) và tạo project mới.
2. Vào **SQL Editor** -> copy toàn bộ file [`supabase/migrations/20260901_init_schema.sql`](./supabase/migrations/20260901_init_schema.sql) và bấm **Run**.

### 3. Cấu hình biến môi trường (`.env.local`)
Copy file `.env.example` thành `.env.local` và điền các thông số từ **Supabase Dashboard -> Project Settings -> API**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Nạp Dữ Liệu Từ Vựng Cào Được (Data Ingestion)
Bạn có thể nạp các file từ vựng cào được vào database chỉ với 1 lệnh:

```bash
# Nạp bộ 25 chủ đề thực tế (500 từ vựng):
node scripts/import_scraped_data.js data/tu_vung_theo_chu_de.json

# Hoặc nạp file cào bất kỳ của bạn:
node scripts/import_scraped_data.js <đường_dẫn_file_json>
```

### 5. Chạy ứng dụng ở môi trường Development
```bash
npm run dev
```
Truy cập [http://localhost:3000](http://localhost:3000) trên trình duyệt để trải nghiệm game!

---

## 📂 Cấu Trúc Thư Mục Dự Án

```
├── data/                       # Dữ liệu từ vựng cào mẫu & template
│   ├── scraper_output_template.json
│   └── tu_vung_theo_chu_de.json
├── public/images/              # Assets hình ảnh Mascot & Logo
├── scripts/                    # Scripts tiện ích Node.js
│   └── import_scraped_data.js  # Pipeline nạp dữ liệu cào tự động vào Supabase
├── src/
│   ├── app/                    # Next.js App Router (Trang chủ, Game route)
│   ├── components/             # UI Components (Header, DeckCard, Modals, Canvas Game)
│   │   └── game/               # MeteorDefenderCanvas 60 FPS Game Loop
│   ├── lib/
│   │   ├── audio/              # Procedural Web Audio Engine
│   │   └── supabase/           # Supabase SSR Browser, Server & Middleware Client
│   ├── stores/                 # Zustand Stores (Auth, Deck, Game Session)
│   └── types/                  # Database TypeScript Type Definitions
└── supabase/
    └── migrations/             # SQL Schema, Triggers, RLS, pgvector & Seed Data
```

---

## 📜 License
Dự án được phân phối dưới giấy phép MIT.
