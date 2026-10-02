# CLAUDE.md — Ecommerce MVP (Microservices)

Tệp này là bộ nhớ làm việc của dự án. Mọi agent trong `.claude/agents/` và mọi phiên làm việc với Claude Code đọc tệp này trước.

## Mục tiêu

Backend RESTful API cho hệ thống thương mại điện tử bản MVP bằng Node.js, theo kiến trúc **Microservices + DDD + Database-per-Service**. Đề bài gốc: `docs/requirements/3._Prompt_microservice.doc`.

Chức năng: đăng ký, đăng nhập, xác thực và phân quyền, quản lý khách hàng, hạng thành viên và điểm score, quản lý sản phẩm, đặt hàng, tính discount theo score, lưu Order và OrderDetail, chuyển đơn sang Shipment, cập nhật trạng thái giao hàng, health check, Dockerize toàn bộ, chạy local bằng Docker Compose.

## Kiến trúc ngắn gọn

- Client chỉ gọi **API Gateway** bằng REST (cổng 3000, cổng duy nhất mở ra máy host).
- Gateway và các service gọi nhau bằng **gRPC**. Hợp đồng nằm trong `proto/`.
- Order → Shipment và Auth → Customer đi qua **Kafka** (bất đồng bộ).
- Gateway dùng **Redis** để cache kết quả xác thực token và giới hạn tốc độ.
- Mỗi service có DB riêng, không truy cập DB của service khác.

| Service | DB | gRPC | Health |
|---|---|---|---|
| api-gateway | Redis | không | 3000 |
| auth-service | PostgreSQL (auth-db) | 50051 | 3001 |
| customer-service | PostgreSQL (customer-db) | 50052 | 3002 |
| order-service | PostgreSQL (order-db) | 50054 | 3003 |
| product-service | MongoDB (product-db) | 50053 | 3004 |
| shipment-service | MongoDB (shipment-db) | 50055 | 3005 |

Nếu bảng này lệch với `docker-compose.yml` thì lấy compose làm chuẩn rồi sửa lại tệp này.

Kafka topic: `user-registered` (Auth → Customer, group `customer-service`) và `order-created` (Order → Shipment, group `shipment-service`). Phát event bằng **Transactional Outbox** (relay đọc bảng `outbox_events`), giao ít nhất một lần, consumer phải idempotent.

## Cấu trúc thư mục

```
ecommerce-microservices/
├── CLAUDE.md
├── .claude/agents/        # ba-agent, dev-agent, test-agent
├── docs/
│   ├── requirements/      # đề, yêu cầu khách hàng, FR, use case, traceability
│   ├── architecture/      # sơ đồ kiến trúc, ERD, luồng đặt hàng
│   ├── api/               # đặc tả API
│   ├── test/              # 25 test case và hướng dẫn chạy
│   └── reports/           # kết quả kiểm thử, giới hạn đã biết
├── services/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── customer-service/
│   ├── product-service/
│   ├── order-service/
│   └── shipment-service/
├── proto/                 # auth, customer, product, order, shipment
├── db/                    # init.sql cho các DB Postgres
├── docker-compose.yml
├── .env.example           # mẫu biến môi trường (KHÔNG commit .env)
└── README.md
```

Mỗi service theo 4 lớp DDD: `domain` (quy tắc nghiệp vụ, không phụ thuộc công nghệ), `application` (use case, mỗi tệp một việc), `infrastructure` (DB, Kafka, gọi gRPC), `interfaces` (gRPC server, Kafka handler). `container.js` nối các lớp, `app.js` khởi động service.

## Lệnh thường dùng

```powershell
docker compose up -d --build     # chạy toàn bộ, chờ khoảng 1 phút
docker compose ps                # phải đủ 13 container (healthy)
curl.exe http://localhost:3000/api/health
docker compose logs <service> --tail 30
docker compose down              # dừng; thêm -v chỉ khi muốn xoá dữ liệu
```

## Quy tắc làm việc (bắt buộc)

1. **Làm đúng tài liệu của giảng viên, không tự bịa.** Chỗ tài liệu không nói rõ thì nêu rõ là thiếu, ghi giả định vào `docs/reports/gioi-han-da-biet.md`, không âm thầm quyết định.
2. Mật khẩu và khoá bí mật chỉ nằm trong `.env`. Không commit `.env`, không ghi giá trị thật vào tài liệu hay mã nguồn. Chỉ cập nhật `.env.example` (tên biến, giá trị mẫu).
3. Giao tiếp nội bộ bằng gRPC, chỉ gateway mở REST. Đổi hợp đồng thì sửa `proto/` trước, rồi sửa các bên gọi.
4. Không để service này đọc trực tiếp DB của service khác.
5. Kafka consumer: sự kiện hỏng (thiếu trường) thì bỏ qua và ghi cảnh báo; lỗi hạ tầng thì ném lỗi để thử lại.
6. Không thêm thư mục `test/` vào từng service. Phần này đã chủ ý gỡ trước buổi chấm; kiểm thử theo `docs/test/`.
7. Sau mỗi thay đổi lớn: `docker compose up -d --build`, chờ 13 container healthy, rồi chạy lại 25 test case.
8. Khi báo kết quả, nêu cả điểm chưa đạt hoặc chưa kiểm chứng; không báo "xong" khi chưa chạy.

## Giả định đã đưa ra (tài liệu không quy định)

- Công thức discount: 1% cho mỗi 100 điểm score, tối đa 100%, nằm trong `order-service/src/domain/pricing.js`. Hạng thành viên: BRONZE 0, SILVER 100, GOLD 500, PLATINUM 1000 điểm.
- Shipment không có quy tắc chuyển trạng thái; chỉ kiểm tra giá trị hợp lệ (PENDING, SHIPPING, DELIVERED, CANCELLED).
- `POST /api/orders` không trả `shipment` vì Shipment được tạo bất đồng bộ; xem bằng `GET /api/orders/{oid}`.

Chi tiết và các giới hạn khác: `docs/reports/gioi-han-da-biet.md`.
