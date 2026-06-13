---
name: upload-baocao-1306
description: Đăng (upload + commit + push) báo cáo dashboard vận hành xuất khẩu gạo AAN của MỘT ngày lên repo VHXK-report (GitHub Pages https://jayjay9x.github.io/VHXK-report/). Nhận ĐẦU VÀO là OUTPUT của skill baocao-dashboard-1306 — file YYYY-MM-DD.html (kèm reports.json tuỳ chọn) — đặt file ngày vào gốc repo, cập nhật reports.json ĐỒNG BỘ ĐỊNH DẠNG với các báo cáo cũ (mảng JSON "YYYY-MM-DD" sắp giảm dần), rồi commit & push để thanh chọn ngày tự nhận file mới. Dùng skill này MỖI KHI người dùng muốn "đăng/upload/commit/publish báo cáo hôm nay", "đẩy báo cáo lên web/GitHub", "cập nhật trang báo cáo lên repo", hoặc gõ /upload-baocao-1306 — ngay cả khi không nói chữ "skill". CHỈ thêm 1 file YYYY-MM-DD.html + cập nhật reports.json; KHÔNG đụng index.html, logo.png, README hay các file ngày khác.
---

# Đăng báo cáo dashboard ngày lên repo VHXK-report (bản 13/06)

Skill này là **bước phát hành** đi kèm skill `baocao-dashboard-1306`. Sau khi `baocao-dashboard-1306`
đã sinh file `YYYY-MM-DD.html` (và `reports.json`) cho một ngày, skill này **đặt file đó vào repo
[VHXK-report](https://jayjay9x.github.io/VHXK-report/)**, cập nhật `reports.json` đồng bộ định dạng
với các báo cáo cũ, rồi **commit & push** để trang chủ (`index.html`) tự redirect sang ngày mới nhất.

Nguyên tắc: **chỉ chạm đúng 2 thứ** — thêm 1 file `YYYY-MM-DD.html` và cập nhật `reports.json`.
KHÔNG sửa `index.html`, `logo.png`, `README.md`, `.nojekyll` hay bất kỳ file ngày nào khác.

## Quy trình (làm tuần tự)

### 1. Xác định file báo cáo cần đăng
Đầu vào là **output của `baocao-dashboard-1306`**: một file tên `YYYY-MM-DD.html`. Người dùng có thể:
- đưa thẳng đường dẫn file (ví dụ vừa sinh ở `/mnt/user-data/outputs/2026-06-13.html`), hoặc
- vừa chạy `baocao-dashboard-1306` trong cùng phiên (file nằm ở thư mục output của skill đó), hoặc
- đã copy sẵn file vào repo.

Nếu chưa có file ngày, **chạy `baocao-dashboard-1306` trước** rồi mới đăng. Nếu mơ hồ ngày nào,
hỏi lại — không tự đoán. Tên file quyết định ngày (`YYYY-MM-DD`).

### 2. Đặt file + đồng bộ reports.json bằng script (không sửa tay)
Chạy script — nó copy file ngày vào gốc repo và cập nhật `reports.json` đúng định dạng cũ
(mảng JSON `"YYYY-MM-DD"` sắp **giảm dần**, `ensure_ascii=False`, kết bằng 1 newline):

```bash
python assets/publish_report.py /đường/dẫn/YYYY-MM-DD.html --repo /home/user/VHXK-report
```

- `--repo` mặc định là git root của thư mục hiện tại; nêu rõ nếu chạy ngoài repo.
- Nếu output của `baocao-dashboard-1306` kèm `reports.json` lịch sử, gộp thêm bằng
  `--reports-json /đường/dẫn/reports.json` (script tự hợp nhất, khử trùng, sắp lại).
- Đăng lại cùng một ngày là **idempotent**: ghi đè file ngày, reports.json không nhân đôi.

Script **chỉ** đụng `YYYY-MM-DD.html` + `reports.json`. Tham khảo các báo cáo cũ trong repo để
chắc chắn định dạng khớp (HTML đã đồng nhất vì cùng template; reports.json giữ nguyên kiểu một dòng).

### 3. Commit & push (chỉ 2 đường dẫn)
Stage đúng file ngày mới và `reports.json`, rồi commit & push lên nhánh đang làm việc:

```bash
git -C /home/user/VHXK-report add YYYY-MM-DD.html reports.json
git -C /home/user/VHXK-report commit -m "Báo cáo dashboard ngày YYYY-MM-DD"
git -C /home/user/VHXK-report push -u origin <nhánh-hiện-tại>
```

- Trước khi commit, chạy `git status`/`git diff --stat` để **xác nhận chỉ 2 file** thay đổi.
  Nếu thấy file khác bị đụng, dừng lại và báo người dùng — không commit kèm.
- Nếu push lỗi mạng, thử lại tối đa 4 lần với backoff (2s, 4s, 8s, 16s).
- KHÔNG tạo pull request trừ khi người dùng yêu cầu rõ.

### 4. Báo kết quả
Cho người dùng biết: ngày đã đăng, `reports.json` mới (danh sách ngày), commit đã push.
Nhắc rằng GitHub Pages cần ít phút để cập nhật; trang chủ
`https://jayjay9x.github.io/VHXK-report/` sẽ tự redirect sang ngày mới nhất.

## Ràng buộc
- **Chỉ** thêm/ghi đè `YYYY-MM-DD.html` và cập nhật `reports.json`. Không thay đổi gì khác.
- `reports.json` luôn là **mảng JSON một dòng**, ngày dạng `YYYY-MM-DD`, **sắp giảm dần**, kết bằng
  một newline — đúng như các báo cáo đã có (ví dụ `["2026-06-12", "2026-06-11", ...]`).
- Nội dung/định dạng HTML đến từ template của `baocao-dashboard-1306`; skill này **không** dựng lại
  hay chỉnh sửa HTML, chỉ phát hành.
- Tên file phải đúng `YYYY-MM-DD.html`; nếu không, script báo lỗi và dừng.
