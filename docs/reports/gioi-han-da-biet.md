# Giới hạn và giả định đã biết

Tài liệu của giảng viên không quy định các điểm dưới đây. Mỗi điểm ghi rõ giả định hiện tại để người đọc biết đây là quyết định của nhóm, không phải yêu cầu của đề.

## Giả định

| Vấn đề | Giả định hiện tại | Vị trí trong mã |
|---|---|---|
| Công thức discount | 1% cho mỗi 100 điểm score, tối đa 100% | `services/order-service/src/domain/pricing.js` |
| Ngưỡng hạng thành viên | BRONZE 0, SILVER 100, GOLD 500, PLATINUM 1000 điểm (mid 1 đến 4) | seed khi khởi tạo DB customer |
| Quy tắc chuyển trạng thái Shipment | Không có; chỉ kiểm tra giá trị hợp lệ `PENDING`, `SHIPPING`, `DELIVERED`, `CANCELLED` | `services/shipment-service/src/application/updateShipmentStatus.js` |
| Kết quả `POST /api/orders` | Không trả `shipment` vì Shipment tạo bất đồng bộ; xem bằng `GET /api/orders/{oid}` | gateway và order-service |

Nếu giảng viên yêu cầu thứ tự trạng thái Shipment, sửa ở tệp `updateShipmentStatus.js` và trả lỗi `FAILED_PRECONDITION` (gateway ánh xạ thành HTTP 409).

## Giới hạn kỹ thuật

- Nếu service sập giữa lúc giữ kho (`ReserveStock`) và trả kho (`ReleaseStock`), tồn kho có thể bị giữ mất. Cách sửa là bảng giữ chỗ có hạn, ngoài phạm vi MVP.
- `oid` có thể nhảy số khi đặt đơn lỗi vì cột dùng dãy số tự tăng của Postgres.
- Mỗi đơn chỉ có một Shipment (chỉ mục duy nhất trên `oid`), trong khi ERD của đề ghi quan hệ Order và Shipment là 0..*.
- Sơ đồ kiến trúc của đề ghi Redis còn "lưu session"; hệ thống chỉ dùng Redis để cache xác thực token và giới hạn tốc độ (đúng đề Prompt 3).
- Kafka chạy một broker, một partition, replication factor 1. Đủ cho MVP, không chịu lỗi broker.
- Kafka giao ít nhất một lần; tính đúng dựa vào consumer idempotent và Outbox.

## Phần làm thêm so với đặc tả

- `POST /api/orders` trả thêm `total_amount`.
- `GET` Customer trả kèm thông tin Membership.
- `GET /api/health` liệt kê tình trạng các phụ thuộc.
- Các mã lỗi 403 theo vai trò (ADMIN, CUSTOMER, SHIPMENT_STAFF).
