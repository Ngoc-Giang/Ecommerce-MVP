# Báo cáo kiểm thử 25 test case

- **Ngày chạy:** 29/09/2026
- **Môi trường:** Docker Desktop (Windows), Docker Compose, 13 container đều `(healthy)`, gateway `http://localhost:3000`
- **Nguồn test case:** `docs/test/25_TestCases_5_BoundedContexts.xlsx`
- **Kết quả:** 25 PASS, 0 FAIL, 0 SKIP

Health trước khi chạy: `status: UP`, các phụ thuộc redis, auth-service, customer-service, product-service, order-service, shipment-service đều `UP`.

| Mã | Nội dung | Kết quả | Bằng chứng |
|---|---|---|---|
| TC-IAM-01 | Đăng ký tài khoản hợp lệ | PASS | 201, có `uid` |
| TC-IAM-02 | Đăng ký trùng username | PASS | 409 |
| TC-IAM-03 | Đăng ký thiếu password | PASS | 400 |
| TC-IAM-04 | Đăng nhập đúng thông tin | PASS | JWT có `sub` và `role=CUSTOMER` |
| TC-IAM-05 | Đăng nhập sai password | PASS | 401 |
| TC-CUS-01 | Lấy Customer tồn tại | PASS | có `fullname`, `mid=1` |
| TC-CUS-02 | Lấy Customer không tồn tại | PASS | 404 |
| TC-CUS-03 | Cập nhật fullname | PASS | lấy lại thấy tên mới |
| TC-CUS-04 | Lấy Membership | PASS | `mname=BRONZE`, `score=0` |
| TC-CUS-05 | Truy vấn Customer không có token | PASS | 401 |
| TC-PRO-01 | Lấy danh sách Product | PASS | có sản phẩm |
| TC-PRO-02 | Lấy Product tồn tại | PASS | 200 |
| TC-PRO-03 | Lấy Product không tồn tại | PASS | 404 |
| TC-PRO-04 | Tạo Product | PASS | 201, có `pid` |
| TC-PRO-05 | Cập nhật tồn kho | PASS | số lượng đúng |
| TC-ORD-01 | Tạo Order hợp lệ | PASS | tồn kho giảm 50 → 48 |
| TC-ORD-02 | Tạo Order không có JWT | PASS | 401 |
| TC-ORD-03 | Đặt vượt tồn kho | PASS | báo `Insufficient stock`, không tạo Order |
| TC-ORD-04 | Tính discount theo score | PASS | score 1000 → discount 20, total_amount 180 |
| TC-ORD-05 | Tạo Order và phát `OrderCreated` | PASS | event trên Kafka có đúng `oid`, `uid` |
| TC-SHP-01 | Nhận `OrderCreated` → tạo Shipment | PASS | Shipment `PENDING` |
| TC-SHP-02 | Event thiếu `oid` | PASS | không tạo Shipment, log cảnh báo |
| TC-SHP-03 | Cập nhật trạng thái sang `SHIPPING` | PASS | 200 |
| TC-SHP-04 | Cập nhật Shipment không tồn tại | PASS | 404 |
| TC-SHP-05 | Nhận cùng event hai lần | PASS | chỉ có 1 Shipment |

## Kiểm tra Kafka

- Topic: `__consumer_offsets`, `order-created`, `user-registered`.
- `order-created`: 1 partition, replication factor 1 (cấu hình MVP một broker).
- Hai consumer group `shipment-service` và `customer-service` có `LAG = 0`.

## Ghi chú

- Kết quả trên là lần chạy bằng script tự động (đã gỡ khỏi repo trước khi chấm). Có thể tái hiện bằng Postman theo `docs/test/huong-dan-chay-test.md`.
