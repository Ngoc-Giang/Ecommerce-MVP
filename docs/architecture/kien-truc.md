# Kiến trúc hệ thống

Sơ đồ nằm cùng thư mục: `01-bounded-contexts-erd.jpg` (5 bounded context), `02-luong-dat-hang.png` (luồng đặt hàng), `03-erd-tong-the.jpg` (ERD tổng thể), `04-kien-truc-he-thong.jpg` (kiến trúc tổng thể).

## Proto và cấu trúc dự án

Proto là hợp đồng gRPC dùng chung: gateway và các service đọc cùng một file trong `proto/`, nên hai bên luôn hiểu đúng kiểu dữ liệu của nhau. Có 5 file, mỗi file ứng với một service.

| File proto | Service | Các lời gọi (RPC) | Ai gọi |
|---|---|---|---|
| `auth.proto` | Auth | `Register`, `Login`, `VerifyToken` | Gateway |
| `customer.proto` | Customer | `GetCustomer`, `UpdateCustomer` | Gateway, Order |
| `product.proto` | Product | `ListProducts`, `GetProduct`, `CreateProduct`, `UpdateProduct`, `DeleteProduct`, `ReserveStock`, `ReleaseStock` | Gateway, Order |
| `order.proto` | Order | `CreateOrder`, `GetOrder`, `ListOrders` | Gateway |
| `shipment.proto` | Shipment | `GetShipment`, `GetShipmentByOrder`, `UpdateShipmentStatus` | Gateway |

Điểm cần nói rõ:

- `VerifyToken` là nơi gateway kiểm tra JWT. Chỉ Auth giữ khóa bí mật; gateway lưu kết quả trong Redis để khỏi hỏi lại.
- `ReserveStock` trừ kho và trả về đơn giá, trọn vẹn hoặc không gì cả. `ReleaseStock` hoàn kho khi đặt đơn thất bại. Hai lời gọi này chỉ Order Service dùng.
- REST không đi thẳng vào service. Client chỉ nói chuyện với gateway (cổng 3000), các service chỉ nghe trong mạng Docker.

### Luồng gọi khi đặt hàng

1. Client gửi `POST /api/orders` đến gateway. Gateway gọi `VerifyToken` để xác thực.
2. Gateway gọi `CreateOrder` của Order Service.
3. Order gọi `GetCustomer` để lấy điểm thành viên, rồi gọi `ReserveStock` để trừ kho.
4. Order tính giảm giá, ghi Order, OrderDetail và một dòng Outbox trong cùng một transaction Postgres.
5. Relay gửi event `OrderCreated` lên Kafka; Shipment Service nhận và tạo Shipment `PENDING`.

### Cấu trúc mỗi service (DDD, 4 lớp)

| Lớp | Chứa gì | Ví dụ |
|---|---|---|
| `domain` | Quy tắc nghiệp vụ và kiểm tra dữ liệu, không phụ thuộc công nghệ | `pricing.js` tính giảm giá |
| `application` | Các use case, mỗi file một việc | `createOrder.js` |
| `infrastructure` | Chỗ nói chuyện với bên ngoài: DB, Kafka, gọi gRPC | `pgOrderRepository.js`, `outboxRelay.js` |
| `interfaces` | Cổng vào của service: gRPC server, Kafka handler | `orderServer.js` |

`container.js` nối các lớp lại với nhau (nơi duy nhất biết lớp nào dùng cài đặt nào) và `app.js` khởi động service. Mỗi service có DB riêng: Auth, Customer, Order dùng Postgres; Product, Shipment dùng Mongo, không có khóa ngoại giữa các DB (Database-per-Service).

## Docker Compose và danh sách container

Hệ thống đúng thiết kế khi có đủ 13 container, khớp sơ đồ kiến trúc: 1 gateway, 5 service, 5 database (3 Postgres, 2 Mongo), Redis và Kafka.

```powershell
docker compose up -d --build
docker compose ps
curl.exe http://localhost:3000/api/health
```

Lệnh `up` tự build image và khởi động theo thứ tự phụ thuộc: DB và Kafka lên trước, rồi đến service, cuối cùng là gateway. `ps` phải có 13 dòng đều `(healthy)`. Lệnh thứ ba trả `status: UP` và liệt kê Redis cùng 5 service đều `UP`.

| Container | Image | Vai trò |
|---|---|---|
| `api-gateway` | build từ mã nguồn | Cửa vào duy nhất (cổng 3000): xác thực JWT, phân quyền, giới hạn tốc độ, ghi log, định tuyến |
| `auth-service`, `auth-db` | build, `postgres:16-alpine` | Tài khoản, vai trò, phát JWT; ghi event `user-registered` |
| `customer-service`, `customer-db` | build, `postgres:16-alpine` | Khách hàng và hạng thành viên; nhận event `user-registered` |
| `product-service`, `product-db` | build, `mongo:7` | Sản phẩm, tồn kho, trừ và hoàn kho |
| `order-service`, `order-db` | build, `postgres:16-alpine` | Đơn hàng, chi tiết đơn, giảm giá; ghi event `order-created` |
| `shipment-service`, `shipment-db` | build, `mongo:7` | Giao hàng; nhận event `order-created` |
| `redis` | `redis:7-alpine` | Cache token, giới hạn tốc độ cho gateway |
| `kafka` | `apache/kafka:3.8.0` | Hàng đợi sự kiện bất đồng bộ |

Nói thêm: chỉ gateway mở cổng ra ngoài (`0.0.0.0:3000`). Các service và DB chỉ nằm trong mạng Docker nên không thể gọi trực tiếp từ bên ngoài. Cột `STATUS` dùng `healthcheck` khai báo trong `docker-compose.yml`, ví dụ `pg_isready` cho Postgres và `wget .../health` cho service.

## Kafka

Kafka chỉ dùng cho việc bất đồng bộ. Muốn có dữ liệu để xem, hãy đặt ít nhất một đơn hàng bằng Postman trước. Chạy 5 lệnh này trong PowerShell tại thư mục gốc:

```powershell
docker compose exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list
docker compose exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic order-created
docker compose exec kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group shipment-service
docker compose exec kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group customer-service
docker compose exec kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic order-created --from-beginning --timeout-ms 8000
```

| Lệnh | Kết quả và cách nói |
|---|---|
| 1. `--list` | Có `order-created` và `user-registered` (cộng `__consumer_offsets` là topic hệ thống). Mỗi luồng sự kiện một topic. |
| 2. `--describe` | `PartitionCount: 1`, `ReplicationFactor: 1`: một broker, một partition, cấu hình MVP. `Leader` và `Isr` đều là broker 1. |
| 3 và 4. `consumer-groups` | `LAG` bằng 0 và `CURRENT-OFFSET` bằng `LOG-END-OFFSET`: mọi event đã được xử lý xong. |
| 5. `console-consumer` | In các dòng JSON `{"oid":...,"uid":...}`. Dòng `ERROR ... TimeoutException` cuối cùng là bình thường: sau 8 giây không có tin mới, consumer tự dừng. |

### Cách giải thích hệ thống Kafka

- **Hai luồng sự kiện.** `user-registered`: Auth phát khi có người đăng ký, Customer nhận và tạo hồ sơ khách hàng. `order-created`: Order phát khi đặt hàng thành công, Shipment nhận và tạo Shipment `PENDING`.
- **Outbox thay vì gửi thẳng.** Đơn hàng và một dòng `outbox_events` được ghi trong cùng một transaction. Relay chạy nền đọc dòng `PENDING`, gửi lên Kafka rồi đổi thành `PUBLISHED`. Nếu Kafka sập sau khi commit, dòng vẫn còn để gửi lại (UC09).
- **Consumer group.** Mỗi service nhận có group riêng (`shipment-service`, `customer-service`) và Kafka nhớ offset đã đọc, nên khởi động lại vẫn tiếp tục đúng chỗ.
- **Chống trùng.** Kafka giao ít nhất một lần nên event có thể đến hai lần. Shipment có chỉ mục duy nhất trên `oid` nên không tạo Shipment trùng (TC-SHP-05).
- **Event hỏng.** Event thiếu `oid` bị bỏ qua và ghi log cảnh báo, không chặn hàng đợi (TC-SHP-02). Lỗi hạ tầng như DB sập thì service ném lỗi để thử lại.
