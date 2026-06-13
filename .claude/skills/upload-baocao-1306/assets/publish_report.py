#!/usr/bin/env python3
"""publish_report.py — Đăng (đặt file + đồng bộ reports.json) báo cáo dashboard 1 ngày lên repo VHXK-report.

Nhận OUTPUT của skill baocao-dashboard-1306 — file `YYYY-MM-DD.html` (và `reports.json` đi kèm,
tuỳ chọn) — rồi:
  1) copy file ngày vào thư mục gốc repo,
  2) cập nhật `reports.json` ĐỒNG BỘ ĐỊNH DẠNG với các báo cáo cũ:
        mảng JSON các chuỗi "YYYY-MM-DD", sắp giảm dần (mới nhất trước),
        ensure_ascii=False, phân tách ", ", kết thúc bằng đúng 1 newline.

Script CHỈ chạm đúng 2 thứ: thêm file ngày + cập nhật reports.json. KHÔNG đụng index.html,
logo.png, README hay các file ngày khác. Việc `git add/commit/push` do SKILL.md hướng dẫn để
bám đúng nhánh phát triển và thông điệp commit.

Dùng:
    python publish_report.py <html> [--repo DIR] [--reports-json FILE]

    <html>            file YYYY-MM-DD.html sinh bởi baocao-dashboard-1306
    --repo DIR        thư mục repo đích (mặc định: git root chứa cwd, fallback cwd)
    --reports-json    reports.json đi kèm output, để gộp thêm các ngày lịch sử (tuỳ chọn)
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ISO_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})\.html$")


def git_root(start: Path) -> Path:
    try:
        out = subprocess.run(
            ["git", "-C", str(start), "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True,
        )
        return Path(out.stdout.strip())
    except Exception:
        return start


def load_dates(path: Path) -> set:
    """Đọc một reports.json, trả về tập ngày; bỏ qua nếu lỗi/không tồn tại."""
    if not path.exists():
        return set()
    try:
        val = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(val, list):
            return {str(d).strip() for d in val if str(d).strip()}
    except Exception:
        pass
    return set()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("html", help="file YYYY-MM-DD.html (output của baocao-dashboard-1306)")
    ap.add_argument("--repo", default=None, help="thư mục repo đích (mặc định: git root của cwd)")
    ap.add_argument("--reports-json", default=None,
                    help="reports.json đi kèm output để gộp thêm ngày lịch sử (tuỳ chọn)")
    args = ap.parse_args()

    src = Path(args.html).expanduser().resolve()
    if not src.is_file():
        sys.exit(f"Không thấy file HTML: {src}")
    m = ISO_RE.match(src.name)
    if not m:
        sys.exit(f"Tên file phải dạng YYYY-MM-DD.html, nhận được: {src.name}")
    iso = m.group(1)

    repo = Path(args.repo).expanduser().resolve() if args.repo else git_root(Path.cwd())
    if not repo.is_dir():
        sys.exit(f"Thư mục repo không tồn tại: {repo}")

    # 1) Copy file ngày vào gốc repo (ghi đè nếu đăng lại cùng ngày).
    dest = repo / f"{iso}.html"
    if src != dest:
        shutil.copyfile(src, dest)

    # 2) Cập nhật reports.json: gộp reports cũ trong repo + reports.json đi kèm (nếu có) + ngày mới.
    rj = repo / "reports.json"
    dates = load_dates(rj)
    if args.reports_json:
        dates |= load_dates(Path(args.reports_json).expanduser().resolve())
    dates.add(iso)
    ordered = sorted(dates, reverse=True)  # mới nhất trước, đồng bộ với báo cáo cũ
    rj.write_text(json.dumps(ordered, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"OK  {dest.relative_to(repo)}  ({dest.stat().st_size} bytes)")
    print(f"    reports.json → {ordered}")
    print(f"    repo: {repo}")
    print("    Bước tiếp theo: git add hai đường dẫn trên rồi commit & push (xem SKILL.md).")


if __name__ == "__main__":
    main()
