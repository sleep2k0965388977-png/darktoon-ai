# DARKTOON AI — Audio to 2D Animated Storytelling Studio

**DARKTOON AI** là ứng dụng web full-stack chuyển đổi file audio hội thoại / kể chuyện thành video hoạt hình 2D theo phong cách **Dark Minimalist 2D Storytelling**, kết hợp **Hybrid 2D Rigging (`RIG_2D`) + AI Image-to-Video (`AI_VIDEO`) + Camera Motion (`STATIC_MOTION`)**, đồng bộ tuyệt đối với âm thanh gốc và cho phép người dùng duyệt, chỉnh sửa từng cảnh trước khi xuất file `.mp4` (H.264 + AAC).

---

## 1. Tính năng cốt lõi đã triển khai

1. **Quản lý Dự án & Upload Audio Gốc (Bước 1 & 2):**
   - Hỗ trợ tỷ lệ `16:9` (YouTube), `9:16` (TikTok/Shorts), `1:1` (Social) ở độ phân giải `720p` và `1080p`.
   - Hỗ trợ tải lên `MP3`, `WAV`, `M4A`, `AAC`, `FLAC` hoặc khởi tạo nhanh file WAV hội thoại mẫu.
   - Audio gốc được giữ làm **Master Clock**, không tự ý thay thế bằng giọng AI.
2. **Phân tích Audio, Speaker Diarization & Story Understanding (Bước 3):**
   - Tách lời thoại kèm timestamp (`start_time`, `end_time`, `words`), nhận diện người nói (`SPK_01`, `SPK_02`...) và phân tích cảm xúc.
   - Cho phép chỉnh sửa trực tiếp từng câu thoại, gán lại người nói và đổi nhãn cảm xúc trước khi tạo Storyboard.
   - Phân tách rõ 3 lớp thông tin theo PRD Mục 6.3: **Explicit Facts** (điều người nói thực sự kể), **Contextual Inferences** (suy luận ngữ cảnh), và **Visual Metaphors** (ẩn dụ thị giác).
3. **AI Story Director & Storyboard Editor 3 Cột + Multi-Track Timeline (Bước 4, 8, 9):**
   - Chia phân cảnh theo ý nghĩa nội dung câu chuyện (không cắt cứng theo số giây).
   - **Cột trái:** Danh sách Scene kèm thumbnail 2D trực tiếp, thời lượng, cảm xúc, phương pháp animation và trạng thái duyệt (`PENDING`, `GENERATED`, `APPROVED`, `NEEDS_REVIEW`, `FAILED`).
   - **Cột giữa:** Canvas 2D Rig tương tác thời gian thực (khớp xương 8 bộ phận + nhép môi theo lời thoại + chuyển động camera `slow_push_in`, `slow_pull_out`, `pan_left`, `pan_right`).
   - **Cột phải:** Inspector chỉnh sửa lời thoại, nhân vật, 17 hành động, 10 biểu cảm, 11 bối cảnh tái sử dụng (`Background ID`), đạo cụ, camera, prompt và nút **Tạo lại Ảnh / Tạo lại Animation** riêng cho từng cảnh.
   - **Phía dưới:** Timeline 6 track (`Audio gốc`, `Phân cảnh`, `Chuyển động`, `Phụ đề`, `Nhạc nền`, `Hiệu ứng âm thanh`) có điều chỉnh âm lượng và tắt tiếng từng track.
4. **Character Library & 8-Part 2D Rig Consistency Engine (Bước 5 & 7):**
   - Mỗi nhân vật có `Character ID` cố định, bảng màu chuẩn Dark Minimalist (`#F4F1EA` trắng ngà cho nhân vật chính, `#CBD5E1` xám sáng cho nhân vật phụ, `#09090C` viền đỏ `#F04444` cho bóng tối tâm lý).
   - Khớp xương 8 bộ phận điều khiển độc lập (`Head`, `Body`, `Left Arm`, `Right Arm`, `Left Leg`, `Right Leg`, `Eyes`, `Mouth`), kết hợp 10 biểu cảm và 17 hành động.
   - Hỗ trợ khóa thiết kế (`locked = true`) để ngăn thay đổi thiết kế nhân vật giữa các cảnh.
5. **Quality Control, Cost Tracking & Real FFmpeg MP4 Export (Bước 10):**
   - Kiểm tra 9 tiêu chí Quality Control trước khi xuất video (thiếu ảnh, thiếu animation, trùng cảnh, lệch thứ tự, lệch thời lượng audio, sai Character ID...).
   - Render video `.mp4` (`libx264` + `aac`) thực tế bằng `ffmpeg-static`.

---

## 2. Hướng dẫn Cài đặt & Chạy Ứng dụng

### Chạy trực tiếp trên máy (Node.js v26+ — Không cần cài thêm Python/Docker)

```bash
cd darktoon-ai

# 1. Cài đặt dependencies
npm.cmd install

# 2. Khởi tạo dữ liệu mẫu (Seed Database)
npm.cmd run seed

# 3. Chạy bộ kiểm thử tự động (12 Integration & Pipeline Tests)
npm.cmd test

# 4. Khởi động ứng dụng ở cổng 3000
npm.cmd run dev
```

Mở trình duyệt tại: `http://localhost:3000`

### Chạy với Docker Compose (PostgreSQL + Redis + MinIO)

```bash
cp .env.example .env
docker compose up --build
```

---

## 3. Hướng dẫn Cấu hình AI Providers & Nguyên tắc Minh bạch (`NOT_CONFIGURED` vs `[MOCK]`)

Ứng dụng sử dụng kiến trúc **Provider Adapter** (`src/backend/providers/interfaces.ts` & `providerRegistry.ts`):
- `ASRProvider` & `DiarizationProvider` (`openai` Whisper / `gemini` / `mock`)
- `LLMProvider` (`openai` GPT-4o / `gemini` 2.5 Flash / `mock`)
- `ImageProvider` (`openai` DALL-E 3 / `gemini` Imagen 3 / `mock`)
- `VideoProvider` (`gemini` Veo 2 / `replicate` Kling / `mock` với cơ chế tự động fallback về `RIG_2D`)

**Nguyên tắc bắt buộc theo PRD Mục 9:**
- Nếu bạn chọn một nhà cung cấp AI thật (`openai`, `gemini`, `replicate`) nhưng **chưa cấu hình API key** (trong `.env` hoặc trong màn hình **Providers & Settings** trên giao diện), hệ thống sẽ hiển thị rõ trạng thái `NOT_CONFIGURED` và từ chối giả lập kết quả AI thật.
- Để kiểm thử toàn bộ luồng khi chưa gắn API key trả phí, bạn có thể chọn chế độ **Development Mock (`mock`)** — mọi dữ liệu sinh ra đều được gắn nhãn `[MOCK]` minh bạch trên giao diện và trong metadata.

---

## 4. Danh mục REST API (`/api/v1/*`)

| Nhóm | Method & Endpoint | Mô tả |
|---|---|---|
| **Auth** | `POST /api/v1/auth/register` | Đăng ký tài khoản mới |
| | `POST /api/v1/auth/login` | Đăng nhập |
| | `POST /api/v1/auth/logout` | Đăng xuất |
| | `GET /api/v1/auth/me` | Lấy thông tin người dùng hiện tại |
| **Projects** | `GET /api/v1/projects` | Danh sách dự án kèm thống kê |
| | `POST /api/v1/projects` | Tạo dự án mới + khởi tạo 6 track timeline |
| | `GET /api/v1/projects/{id}` | Chi tiết dự án, scenes, characters, timeline, QC, costs |
| | `PATCH /api/v1/projects/{id}` | Cập nhật cấu hình dự án |
| | `DELETE /api/v1/projects/{id}` | Soft-delete dự án |
| **Audio** | `POST /api/v1/projects/{id}/audio/upload` | Upload file audio gốc hoặc tạo WAV hội thoại mẫu |
| | `GET /api/v1/projects/{id}/audio` | Lấy metadata & stream audio gốc (`?stream=1`) |
| | `POST /api/v1/projects/{id}/audio/analyze` | Chạy ASR + Speaker Diarization + Story Analysis |
| **Transcript** | `GET /api/v1/projects/{id}/transcript` | Lấy transcript, timestamps, speakers, story analysis |
| | `PATCH /api/v1/projects/{id}/transcript` | Sửa lời thoại, người nói, cảm xúc từng đoạn |
| | `POST /api/v1/projects/{id}/transcript/reanalyze` | Phân tích lại transcript |
| **Storyboard** | `POST /api/v1/projects/{id}/storyboard/generate` | AI Director tạo Storyboard + Character + 2D Rig |
| | `GET /api/v1/projects/{id}/scenes` | Danh sách toàn bộ các cảnh |
| | `GET /api/v1/scenes/{scene_id}` | Chi tiết một cảnh |
| | `PATCH /api/v1/scenes/{scene_id}` | Chỉnh sửa thuộc tính / duyệt cảnh (`APPROVED` / `NEEDS_REVIEW`) |
| | `POST /api/v1/scenes/{scene_id}/regenerate-image` | Tạo lại ảnh cảnh (tăng `version + 1`, giữ bản cũ) |
| | `POST /api/v1/scenes/{scene_id}/regenerate-animation` | Tạo lại animation cảnh (`RIG_2D` / `AI_VIDEO` / `STATIC_MOTION`) |
| **Characters** | `GET /api/v1/projects/{id}/characters` | Danh sách nhân vật trong Character Library |
| | `POST /api/v1/projects/{id}/characters` | Tạo nhân vật mới |
| | `PATCH /api/v1/characters/{character_id}` | Cập nhật thiết kế (chặn nếu `locked = true`) |
| | `POST /api/v1/characters/{character_id}/generate-reference` | Tạo Character Reference Sheet |
| | `POST /api/v1/characters/{character_id}/lock` | Khóa / Mở khóa thiết kế nhân vật |
| **Assets** | `GET /api/v1/projects/{id}/assets` | Danh sách toàn bộ versioned assets |
| | `GET /api/v1/assets/{asset_id}` | Metadata hoặc tải file (`?raw=1`) |
| | `POST /api/v1/assets/{asset_id}/retry` | Tạo lại phiên bản mới cho asset |
| **Render** | `POST /api/v1/projects/{id}/render` | Kiểm tra QC & Render MP4 H.264 bằng FFmpeg |
| | `GET /api/v1/projects/{id}/render-status` | Kiểm tra tiến trình render & báo cáo QC |
| | `POST /api/v1/projects/{id}/render/cancel` | Hủy tiến trình render đang chạy |
| | `GET /api/v1/projects/{id}/export` | Xem thông tin hoặc tải file `.mp4` (`?download=1`) |
| **Jobs & Providers**| `GET /api/v1/jobs/{job_id}` | Trạng thái background job |
| | `POST /api/v1/jobs/{job_id}/retry` | Retry job lỗi |
| | `POST /api/v1/jobs/{job_id}/cancel` | Hủy job |
| | `GET/POST /api/v1/providers` | Kiểm tra trạng thái `CONFIGURED` / `NOT_CONFIGURED` & lưu API keys |
