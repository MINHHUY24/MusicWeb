# MusicWeb

> MusicWeb là web app nghe nhạc cá nhân được xây dựng bằng React và Vite, cho phép người dùng duyệt bài hát, phát nhạc, quản lý playlist, xem thể loại, upload track local và theo dõi thư viện cá nhân.

![React](https://img.shields.io/badge/React-19+-blue.svg) ![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg) ![React Router](https://img.shields.io/badge/React%20Router-7-red.svg) ![IndexedDB](https://img.shields.io/badge/IndexedDB-Local%20Storage-2F80ED.svg) ![CSS](https://img.shields.io/badge/CSS-Custom-1572B6.svg)

---

## Giới thiệu

**MusicWeb** là một ứng dụng nghe nhạc trên trình duyệt với giao diện dạng music dashboard. Dự án tập trung vào trải nghiệm duyệt nhạc nhanh, phát nhạc trực tiếp, chia bài hát theo playlist/thể loại và hỗ trợ upload nhạc từ máy người dùng.

Ứng dụng có thanh điều hướng bên trái, topbar tìm kiếm, khu nội dung thay đổi theo route và thanh phát nhạc cố định ở cuối màn hình. Người dùng có thể bấm vào bài hát ở Home, Category, Playlist hoặc Profile để phát ngay bằng player chung của toàn app.

## Mục tiêu của dự án

Dự án này được phát triển với mục tiêu:

- Xây dựng giao diện nghe nhạc hiện đại bằng React
- Thực hành routing với React Router
- Quản lý trạng thái player ở cấp ứng dụng
- Tổ chức dữ liệu bài hát, playlist, category và profile theo module riêng
- Hỗ trợ phát audio, tua bài, chỉnh âm lượng, shuffle, repeat và xem hàng chờ
- Xây dựng tính năng upload nhạc local bằng IndexedDB và Vite middleware
- Tạo nền tảng có thể mở rộng thêm đăng nhập, backend hoặc database thật trong tương lai

## Tính năng chính

### Trang Home

- Hiển thị các lane nhạc dạng cuộn ngang
- Có các nhóm: Trending Music, Chill và Mới phát hành
- Sắp xếp Trending theo số lượt click trong phiên sử dụng
- Bấm vào card nhạc để phát bài hát
- Tự nhận diện khi lane cần nút "Xem thêm" hoặc "Thu gọn"

### Music Player

- Thanh phát nhạc cố định ở cuối màn hình
- Hiển thị ảnh bìa, tên bài hát và nghệ sĩ đang phát
- Phát/tạm dừng bài hát
- Chuyển bài trước/sau
- Tua bài bằng timeline
- Chỉnh âm lượng
- Bật/tắt shuffle
- Chuyển chế độ repeat: off, one, all
- Mở danh sách bài tiếp theo và chọn bài trong queue

### Trang Category

- Hiển thị danh sách thể loại nhạc hiện có trong thư viện
- Tự tính số bài hát theo từng thể loại
- Tự lấy ảnh bìa từ bài hát đầu tiên trong thể loại
- Vào trang chi tiết thể loại để xem danh sách track
- Phát toàn bộ thể loại hoặc phát từng bài riêng lẻ

### Trang Playlist

- Hiển thị các playlist mặc định như Tất cả bài hát, Sơn Tùng M-TP và Việt mix
- Tạo playlist mới bằng dialog
- Upload ảnh bìa playlist
- Chọn tone màu cho playlist
- Tìm kiếm bài hát trong form tạo playlist
- Chọn nhiều bài hát để đưa vào playlist
- Tự tính số bài và thời lượng playlist

> Lưu ý: playlist tạo mới đang được lưu trong state của phiên chạy hiện tại. Khi reload trang, dữ liệu playlist mới sẽ quay về mặc định.

### Trang Playlist Detail

- Hiển thị thông tin playlist, ảnh bìa, mô tả, số bài và thời lượng
- Phát toàn bộ playlist từ bài đầu tiên
- Hiển thị danh sách track trong playlist
- Bấm từng track để phát từ vị trí được chọn

### Trang Upload

- Upload file audio từ máy người dùng
- Hỗ trợ MP3, WAV, FLAC, AIFF, AIF, ALAC, M4A và OGG
- Upload ảnh bìa cho track
- Nhập tên track, nghệ sĩ, thể loại và mô tả
- Đọc duration của file audio trước khi lưu
- Lưu track vào IndexedDB của trình duyệt
- Khi chạy dev server, Vite middleware lưu thêm file vào:
  - `src/datas/songs`
  - `src/assets/image_song`
  - `src/datas/uploadedSongs.json`
- Hiển thị thư viện upload local
- Nghe thử hoặc xóa track đã upload

### Trang Profile

- Hiển thị thông tin người dùng mẫu
- Thống kê số bài yêu thích, lịch sử nghe và bài đã upload
- Chia nhạc thành 3 tab:
  - Yêu thích
  - Lịch sử
  - Nhạc đã up
- Danh sách Nhạc đã up tự đọc từ IndexedDB
- Có empty state dẫn sang trang Upload khi chưa có track upload

### Điều hướng và responsive

- Sidebar có thể thu gọn/mở rộng
- Sidebar tự chuyển sang chế độ compact trên màn hình nhỏ
- Route không tồn tại sẽ tự chuyển về Home
- Các trang chính được quản lý bằng React Router

## Công nghệ sử dụng

### Frontend

- React 19
- Vite 8
- React Router DOM 7
- CSS thuần
- Phosphor Icons
- Lucide React

### Local storage & upload

- IndexedDB để lưu track upload trong trình duyệt
- Vite dev server middleware để nhận upload qua `/api/upload-track`
- File API, Blob URL và FormData để preview/lưu file

### Tooling

- npm
- ESLint
- Vite build/preview

## Cấu trúc dự án

```text
MusicWeb/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/
│   │   ├── hero.png
│   │   └── image_song/
│   ├── components/
│   │   ├── card_category.jsx
│   │   ├── card_music.jsx
│   │   ├── card_playlist.jsx
│   │   ├── footer.jsx
│   │   ├── sidebar.jsx
│   │   └── topbar.jsx
│   ├── datas/
│   │   ├── songs/
│   │   ├── categoryData.js
│   │   ├── homeData.js
│   │   ├── playlistData.js
│   │   ├── profileData.js
│   │   ├── songData.js
│   │   ├── uploadData.js
│   │   ├── uploadedSongs.json
│   │   └── uploadStorage.js
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
│   ├── index.css
│   └── main.jsx
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

## Cách sử dụng ứng dụng

### 1. Nghe nhạc ở Home

Vào trang Home, chọn một bài trong các lane nhạc. Player ở cuối màn hình sẽ bắt đầu phát bài được chọn và giữ queue theo lane hiện tại.

### 2. Duyệt theo thể loại

Vào Category, chọn một thể loại nhạc, sau đó bấm nút play để phát toàn bộ danh sách hoặc chọn từng bài trong danh sách.

### 3. Duyệt theo playlist

Vào Playlist để xem các playlist có sẵn. Chọn một playlist để vào trang chi tiết và phát danh sách nhạc tương ứng.

### 4. Tạo playlist mới

Ở trang Playlist, bấm card "Your playlist", nhập tên playlist, mô tả, chọn tone, upload ảnh bìa nếu cần và chọn bài hát muốn thêm vào playlist.

### 5. Upload nhạc

Ở trang Upload:

1. Chọn file audio.
2. Bấm Tiếp tục.
3. Nhập tên track, nghệ sĩ, thể loại, mô tả và ảnh bìa nếu có.
4. Bấm Lưu track.
5. Track sẽ xuất hiện trong Thư viện local và tab Nhạc đã up ở Profile.

### 6. Quản lý nhạc cá nhân

Vào Profile để xem bài yêu thích, lịch sử nghe và danh sách nhạc đã upload. Bấm vào một bài bất kỳ để phát bằng player chung.

## Cài đặt và chạy project

### Yêu cầu

Trước khi chạy project, cần cài:

- Node.js 18+
- npm
- Git

### 1. Clone repository

```bash
git clone <repository-url>
cd MusicWeb
```

### 2. Cài dependencies

```bash
npm install
```

### 3. Chạy project ở môi trường development

```bash
npm run dev
```

Thông thường Vite sẽ chạy tại:

```text
http://localhost:5173
```

Nếu port 5173 đang bận, Vite có thể tự chuyển sang port khác.

### 4. Build production

```bash
npm run build
```

### 5. Xem bản production build

```bash
npm run preview
```

### 6. Kiểm tra lint

```bash
npm run lint
```

## Scripts

| Lệnh              | Chức năng                    |
| ----------------- | ---------------------------- |
| `npm run dev`     | Chạy Vite dev server         |
| `npm run build`   | Build project cho production |
| `npm run preview` | Preview bản build production |
| `npm run lint`    | Kiểm tra code bằng ESLint    |

## Dữ liệu nhạc

Dữ liệu bài hát được quản lý trong `src/datas/songData.js`.

Các bài hát gốc được import từ:

- `src/assets/image_song`
- `src/datas/songs`

Các bài hát upload bằng dev server được ghi vào:

- `src/datas/uploadedSongs.json`

Sau đó `songLibrary` sẽ gộp:

```js
export const songLibrary = [...baseSongs, ...normalizedUploadedSongs];
```

Các module như Home, Category, Playlist và Profile đều đọc dữ liệu từ `songLibrary`, nên bài upload mới có thể xuất hiện trong các khu vực tương ứng sau khi dữ liệu được cập nhật.

## Upload local hoạt động như thế nào?

MusicWeb dùng 2 lớp lưu trữ:

### 1. IndexedDB

Track upload được lưu vào IndexedDB với database:

```text
musicweb-local-datas
```

Object store:

```text
uploadedTracks
```

Cách này giúp track vẫn còn trong trình duyệt sau khi reload trang.

### 2. Vite middleware

Khi chạy `npm run dev`, `vite.config.js` đăng ký endpoint:

```text
POST /api/upload-track
```

Endpoint này nhận FormData, lưu audio/cover vào source local và cập nhật `uploadedSongs.json`. Đây là tính năng dành cho môi trường development.

## Các route chính

| Route                   | Trang                 |
| ----------------------- | --------------------- |
| `/`                     | Home                  |
| `/playlist`             | Danh sách playlist    |
| `/playlist/:playlistId` | Chi tiết playlist     |
| `/category`             | Danh sách thể loại    |
| `/category/:categoryId` | Chi tiết thể loại     |
| `/upload`               | Upload nhạc           |
| `/profile`              | Hồ sơ và nhạc cá nhân |

## Nếu gặp lỗi

### 1. Không phát được nhạc

Kiểm tra:

- File audio có tồn tại trong `src/datas/songs` không
- Đường dẫn import trong `songData.js` có đúng không
- Trình duyệt có chặn autoplay không
- Bạn đã bấm nút play hoặc chọn bài hát chưa

### 2. Upload không lưu vào source file

Kiểm tra:

- Project đang chạy bằng `npm run dev`
- Endpoint `/api/upload-track` trong `vite.config.js` còn được đăng ký
- File audio đúng định dạng được hỗ trợ
- Terminal dev server có báo lỗi ghi file không

Nếu dev API lỗi, app vẫn có thể lưu track trong IndexedDB của trình duyệt.

### 3. Nhạc upload không hiện sau khi reload

Kiểm tra:

- Trình duyệt có hỗ trợ IndexedDB không
- Bạn có đang dùng chế độ ẩn danh không
- DevTools Application > IndexedDB có database `musicweb-local-datas` không
- File `src/datas/uploadedSongs.json` có được cập nhật không nếu muốn lưu vào source

### 4. Playlist tạo mới bị mất sau reload

Đây là hành vi hiện tại của project. Playlist tạo mới đang lưu bằng React state, chưa lưu vào IndexedDB hoặc backend.

### 5. Lỗi port đang được dùng

Nếu port 5173 bị chiếm, có thể chạy:

```bash
npm run dev -- --port 5174
```

### 6. Lỗi dependency

Thử cài lại dependencies:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Hướng phát triển tiếp

- Lưu playlist tạo mới vào IndexedDB
- Đồng bộ playlist và upload với backend thật
- Thêm đăng nhập người dùng
- Thêm chức năng tìm kiếm bài hát thật trong Topbar
- Thêm favorite/unfavorite cho từng track
- Thêm trang artist detail
- Thêm dark/light theme
- Thêm kéo thả sắp xếp queue hoặc playlist

## Ghi chú

Project hiện là frontend app chạy bằng Vite. Dữ liệu người dùng và upload chủ yếu được lưu local, phù hợp cho học tập, demo UI và phát triển prototype nghe nhạc cá nhân.

## Liên hệ

- **GitHub:** https://github.com/MINHHUY24
- **Email:** huyleminh93vvk@gmail.com

Bạn có thể tạo issue trong GitHub repository nếu gặp lỗi hoặc muốn góp ý tính năng.

## License

Dự án này được phát triển cho mục đích học tập và thực hành cá nhân.
