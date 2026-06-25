# Ứng dụng quản lý thu chi gia đình

Ứng dụng quản lý thu chi gia đình cho bố mẹ, chị và cháu. Thiết kế giao diện hiện đại, dễ dùng, có biểu đồ thống kê thu chi tổng thể và theo từng người.

## Tính năng

- Quản lý thu chi theo cá nhân và toàn bộ gia đình
- Hiển thị biểu đồ thống kê
- Thêm, sửa, xóa giao dịch
- Phân loại chi tiêu và thu nhập
- Báo cáo tổng hợp theo ngày, tháng
- Giao diện responsive, đẹp mắt
 - Đăng ký / Đăng nhập (mỗi người có dữ liệu riêng tư)
 - Xuất dữ liệu sang Excel hoặc PDF

## Công nghệ

- Frontend: React
- Backend: Express
- Cơ sở dữ liệu: SQLite
- Docker: file cấu hình để triển khai nhanh

## Triển khai

Bạn có thể deploy lên Render bằng Docker.

## Kết nối và chạy

- Khởi tạo: `docker compose up --build`
- Truy cập frontend: `http://localhost:3000`
- API backend: `http://localhost:4000`

Authentication:

- `POST /api/auth/register` { name, username, password } → trả về token
- `POST /api/auth/login` { username, password } → trả về token

Dev default accounts:

- `admin` / `admin` (admin user)
- `bo` / `pass123`, `me` / `pass123`, `chi` / `pass123`, `chau` / `pass123`

Export:

- `GET /api/export/excel` (cần Authorization header) → tải file Excel
- `GET /api/export/pdf` (cần Authorization header) → tải file PDF

## Cấu trúc dự án

- `src/client`: frontend React
- `src/server`: backend Express
- `db`: SQLite database
