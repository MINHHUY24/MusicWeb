# MusicWeb

MusicWeb là web app nghe nhạc cá nhân dùng React, Vite, Node.js backend và Supabase. Ứng dụng hỗ trợ đăng nhập Google, upload audio/cover lên Supabase Storage, lưu metadata track trong Supabase Database, duyệt nhạc theo trang chủ/thể loại/danh sách phát và phát nhạc bằng player chung.

![React](https://img.shields.io/badge/React-19-blue.svg) ![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg) ![Node.js](https://img.shields.io/badge/Node.js-API-339933.svg) ![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB%20%2B%20Storage-3ECF8E.svg)

## Tính Năng

- Đăng nhập Google qua Supabase Auth.
- Topbar tìm kiếm bài hát/nghệ sĩ, đổi ngôn ngữ Việt/Anh và quản lý tài khoản.
- Home hiển thị các lane nhạc lấy từ Supabase.
- Thể loại đọc từ bảng `categories`, tự tính số bài và ảnh bìa theo track.
- Danh sách phát mặc định gồm tất cả bài hát, Sơn Tùng M-TP và Việt mix.
- Tạo danh sách phát cá nhân và lưu vào Supabase theo tài khoản.
- Upload audio và ảnh bìa qua Node API vào Supabase Storage.
- Player cố định dưới màn hình với play/pause, next/previous, shuffle, repeat, seek, volume mặc định 100%.
- Popup "Phát tiếp theo" cho phép chọn bài tiếp theo trong queue.
- Tim bài đang phát để đưa vào Yêu thích.
- Lịch sử chỉ ghi bài đã phát thật, bài gần đây nằm trước.
- Profile hiển thị Yêu thích, Lịch sử, Nhạc đã up và hỗ trợ xóa track đã upload.
- Responsive sidebar có thể thu gọn/mở rộng.

## Công Nghệ

- React 19
- Vite 8
- React Router DOM 7
- Supabase JS
- Node.js HTTP server
- Supabase Auth, REST API và Storage
- CSS thuần
- Phosphor Icons
- ESLint

## Cấu Trúc

```text
MusicWeb/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── server/
│   └── index.js
├── src/
│   ├── assets/
│   │   └── hero.png
│   ├── components/
│   │   ├── auth_gate.jsx
│   │   ├── card_category.jsx
│   │   ├── card_music.jsx
│   │   ├── card_playlist.jsx
│   │   ├── footer.jsx
│   │   ├── loading_state.jsx
│   │   ├── login_card.jsx
│   │   ├── sidebar.jsx
│   │   ├── topbar.jsx
│   │   └── user_avatar.jsx
│   ├── datas/
│   │   ├── categoryData.js
│   │   ├── playlistData.js
│   │   ├── profileData.js
│   │   ├── uploadData.js
│   │   └── uploadStorage.js
│   ├── lib/
│   │   └── supabaseClient.js
│   ├── pages/
│   │   ├── category.jsx
│   │   ├── category_detail.jsx
│   │   ├── home.jsx
│   │   ├── playlist.jsx
│   │   ├── playlist_detail.jsx
│   │   ├── profile.jsx
│   │   └── upload.jsx
│   ├── styles/
│   ├── App.css
│   ├── App.jsx
│   ├── i18n.jsx
│   ├── index.css
│   └── main.jsx
├── .env.example
├── supabase-auth-setup.sql
├── vite.config.js
├── package.json
└── README.md
```

## Routes

| Route                   | Chức năng                             |
| ----------------------- | ------------------------------------- |
| `/`                     | Trang chủ, các lane nhạc              |
| `/category`             | Danh sách thể loại                    |
| `/category/:categoryId` | Chi tiết thể loại                     |
| `/playlist`             | Danh sách phát                        |
| `/playlist/:playlistId` | Chi tiết danh sách phát               |
| `/upload`               | Upload nhạc                           |
| `/profile`              | Hồ sơ, yêu thích, lịch sử, nhạc đã up |

Các route `/category`, `/playlist`, `/profile`, `/upload` và route chi tiết cần đăng nhập.

## Cài Đặt

### Yêu Cầu

- Node.js 18+
- npm
- Supabase project
- Google OAuth đã bật trong Supabase Auth nếu muốn đăng nhập Google

### 1. Cài dependencies

```bash
npm install
```

### 2. Tạo file môi trường

Copy `.env.example` thành `.env`:

```bash
cp .env.example .env
```

Điền các biến:

```env
PORT=3001
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_AUDIO_BUCKET=track-audio
SUPABASE_COVER_BUCKET=track-covers
```

`SUPABASE_SERVICE_ROLE_KEY` chỉ chạy trong Node backend. Không import key này vào frontend.

### 3. Chuẩn bị Supabase Storage

Tạo 2 bucket:

- `track-audio`
- `track-covers`

Backend đang tạo public URL bằng `/storage/v1/object/public/...`, vì vậy bucket cần public hoặc cần policy đọc public tương ứng.

### 4. Chuẩn bị Supabase Database

Ứng dụng đọc bảng `categories` và `tracks`.

Schema khuyến nghị:

```sql
create extension if not exists pgcrypto;

create table if not exists public.categories (
  id text primary key,
  name text not null,
  description text,
  tone text default 'blue',
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  category_id text references public.categories(id),
  description text,
  duration_seconds int,
  duration_label text,
  audio_path text,
  cover_path text,
  audio_file_name text,
  audio_file_size int,
  cover_file_name text,
  cover_file_size int,
  status text default 'published',
  user_id uuid references auth.users(id) on delete cascade,
  clicks int default 0,
  created_at timestamptz default now()
);

create index if not exists tracks_user_id_created_at_idx
  on public.tracks (user_id, created_at desc);

create index if not exists tracks_user_id_status_idx
  on public.tracks (user_id, status);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  tone text default 'blue',
  cover_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.playlist_tracks (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  position int not null default 0,
  created_at timestamptz default now(),
  primary key (playlist_id, track_id)
);

create index if not exists playlists_user_id_created_at_idx
  on public.playlists (user_id, created_at desc);

create index if not exists playlist_tracks_playlist_position_idx
  on public.playlist_tracks (playlist_id, position);
```

Repo cũng có `supabase-auth-setup.sql` để thêm cột/index `user_id` nếu bảng `tracks` đã tồn tại và tạo thêm bảng playlist. Backend có fallback cho schema cũ chưa có `user_id`, `status`, `created_at` hoặc relationship embed `categories`, nhưng schema trên là cấu hình nên dùng.

### 5. Seed thể loại

Bạn có thể seed các category theo `src/datas/categoryData.js`. Cột cần quan tâm là:

- `id`
- `name`
- `description`
- `tone`
- `sort_order`
- `is_active`

## Chạy Development

Mở terminal 1 chạy backend:

```bash
npm run dev:api
```

Mở terminal 2 chạy frontend:

```bash
npm run dev
```

Vite mặc định chạy ở:

```text
http://localhost:5173
```

Frontend gọi `/api/*` qua proxy trong `vite.config.js` tới backend `http://127.0.0.1:3001`.

## Scripts

| Lệnh              | Chức năng                        |
| ----------------- | -------------------------------- |
| `npm run dev`     | Chạy Vite dev server             |
| `npm run dev:api` | Chạy Node API server bằng `.env` |
| `npm run build`   | Build production                 |
| `npm run preview` | Preview production build         |
| `npm run lint`    | Kiểm tra ESLint                  |

## Backend API

Node server nằm tại `server/index.js`.

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| `GET` | `/api/health` | Kiểm tra API sống |
| `GET` | `/api/auth/config` | Trả `SUPABASE_URL` và `SUPABASE_ANON_KEY` cho frontend |
| `GET` | `/api/categories` | Lấy thể loại active và số bài theo thể loại |
| `GET` | `/api/tracks` | Lấy toàn bộ track published để hiển thị public |
| `GET` | `/api/me/tracks` | Lấy track published đã upload của tài khoản đang đăng nhập |
| `POST` | `/api/tracks` | Upload audio/cover và insert metadata track |
| `DELETE` | `/api/tracks/:id` | Xóa metadata và object trong Storage |

Các endpoint upload/xóa và `/api/me/tracks` cần `Authorization: Bearer <supabase-access-token>`.

## Luồng Dữ Liệu

1. Frontend gọi `/api/auth/config` để khởi tạo Supabase client.
2. Người dùng đăng nhập Google qua Supabase Auth.
3. Frontend gọi `/api/tracks` và `/api/categories` để lấy thư viện public cho Home.
4. Khi đã đăng nhập, frontend gọi thêm `/api/me/tracks` và `/api/me/playlists` kèm access token để lấy nhạc đã upload và playlist của tài khoản.
5. Backend dùng service role key để đọc/ghi Database và Storage.
6. Home, Category, Playlist, Profile nhận dữ liệu track/category/playlist từ API.
7. Khi upload/xóa thành công, frontend dispatch event `musicweb:tracks-updated` để reload thư viện.

## Ghi Chú Về State

- Yêu thích lưu trong `localStorage` bằng key `musicweb:favorite-track-ids`.
- Lịch sử nghe lưu trong `localStorage` bằng key `musicweb:listening-history-track-ids`.
- Danh sách phát tạo mới lưu trong Supabase bằng bảng `playlists` và `playlist_tracks`.
- Track/audio/cover upload được lưu thật trong Supabase.
- Source không còn dùng file audio demo local trong `src/datas/songs`.

## Kiểm Tra

```bash
npm run lint
npm run build
```

Nếu muốn kiểm tra cú pháp backend:

```bash
node --check server/index.js
```

## Lỗi Thường Gặp

### Home hoặc Thể loại không hiện nhạc

- Kiểm tra backend đã chạy `npm run dev:api`.
- Kiểm tra bảng `tracks` có dữ liệu.
- Kiểm tra `/api/tracks` trả JSON hợp lệ.
- Kiểm tra terminal backend để xem lỗi Supabase.

### Lỗi `column tracks.user_id does not exist`

Chạy SQL trong `supabase-auth-setup.sql`, hoặc dùng schema khuyến nghị ở phần Database. Backend có fallback cho trường hợp thiếu `user_id`, nhưng nên thêm cột này nếu muốn dữ liệu tách theo user.

### Upload thành công nhưng ảnh/audio không phát

- Kiểm tra bucket `track-audio` và `track-covers`.
- Kiểm tra bucket/policy cho phép đọc public nếu dùng public URL.
- Kiểm tra `audio_path` và `cover_path` trong bảng `tracks`.

### Không đăng nhập được Google

- Kiểm tra `SUPABASE_URL` và `SUPABASE_ANON_KEY`.
- Bật Google provider trong Supabase Auth.
- Thêm redirect URL của local app, ví dụ `http://localhost:5173`.

### Port bị chiếm

Đổi port frontend:

```bash
npm run dev -- --port 5174
```

Đổi port backend trong `.env`:

```env
PORT=3002
```

Nếu đổi backend port, chạy Vite với `API_PROXY_TARGET=http://127.0.0.1:<port>` để trỏ proxy sang port backend khác.

## Hướng Phát Triển

- Thêm bảng favorites/history server-side thay vì localStorage.
- Thêm artist detail.
- Thêm quản trị category/track.
- Thêm kéo thả sắp xếp queue/danh sách phát.
- Tối ưu code splitting để giảm cảnh báo chunk size khi build.

## Liên hệ

- GitHub: https://github.com/MINHHUY24
- Email: huyleminh93vvk@gmail.com
- Bạn có thể tạo issue trong GitHub repository nếu gặp lỗi hoặc muốn góp ý tính năng.

## License

Dự án phục vụ học tập và thực hành cá nhân.
