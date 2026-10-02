# Hướng dẫn chạy test

## Chuẩn bị

- Hệ thống đang chạy: `docker compose ps` đủ 13 container `(healthy)`.
- Cần 3 vai trò: ADMIN, SHIPMENT_STAFF (tài khoản tạo sẵn từ biến môi trường trong `.env`) và một khách hàng đăng ký mới. Đăng nhập từng tài khoản bằng `POST /api/auth/login`, lấy `accessToken`.
- Tạo sẵn ít nhất một sản phẩm bằng token ADMIN để có `pid`. Ghi `uid`, `pid`, `oid`, `shipid` sau mỗi response.
- Đăng ký và đăng nhập giới hạn 10 lần mỗi phút (HTTP 429 khi vượt); chờ 1 phút rồi gửi lại.

## Chạy 25 test case bằng Postman

Hướng dẫn này áp dụng cho `25_TestCases_5_BoundedContexts.xlsx` (5 nhóm: IAM, CUS, PRO, ORD, SHP). Địa chỉ gốc là `http://localhost:3000`. Mỗi request POST, PUT, PATCH cần header `Content-Type: application/json` và body chọn *raw* kiểu JSON. Request cần đăng nhập thì vào tab Authorization, chọn *Bearer Token* và dán `accessToken`. Trong bảng, `{uid}`, `{pid}`, `{oid}`, `{shipid}` là giá trị bạn ghi từ response trước.

| Test case | Request | Token | Body chính | Kết quả mong đợi |
|---|---|---|---|---|
| TC-IAM-01 | `POST /api/auth/register` | không | `{"username":"an01","password":"P@ssw0rd123","email":"an01@example.com","phone":"0900000000"}` | 201, có `uid` |
| TC-IAM-02 | `POST /api/auth/register` | không | gửi lại đúng body của TC-IAM-01 | 409 |
| TC-IAM-03 | `POST /api/auth/register` | không | như TC-IAM-01 nhưng `"password":""` và username mới | 400 |
| TC-IAM-04 | `POST /api/auth/login` | không | `{"username":"an01","password":"P@ssw0rd123"}` | 200, có `accessToken` (JWT) |
| TC-IAM-05 | `POST /api/auth/login` | không | mật khẩu sai | 401 |
| TC-CUS-01 | `GET /api/customers/{uid}` | khách | – | 200: `uid`, `fullname`, `mid` |
| TC-CUS-02 | `GET /api/customers/999999999` | ADMIN | – | 404 |
| TC-CUS-03 | `PUT /api/customers/{uid}` rồi GET lại | khách | `{"fullname":"Nguyen Van A"}` | 200; GET thấy tên mới |
| TC-CUS-04 | `GET /api/customers/{uid}` | khách | – | có `membership.mname` và `score` |
| TC-CUS-05 | `GET /api/customers/{uid}` | không | – | 401 |
| TC-PRO-01 | `GET /api/products` | bất kỳ | – | 200, mảng `items` |
| TC-PRO-02 | `GET /api/products/{pid}` | bất kỳ | – | 200 |
| TC-PRO-03 | `GET /api/products/999999999` | bất kỳ | – | 404 |
| TC-PRO-04 | `POST /api/products` | ADMIN | `{"pname":"Laptop","price":1500,"quantity":10}` | 201, có `pid` |
| TC-PRO-05 | `PUT /api/products/{pid}` rồi GET lại | ADMIN | `{"pname":"Laptop","price":1500,"quantity":37}` | 200; GET thấy `quantity` 37 |
| TC-ORD-01 | `POST /api/orders` rồi `GET /api/orders/{oid}` | khách | `{"items":[{"pid":{pid},"qty":2}]}` | 201, `items` có `unit_price`; GET lại thấy OrderDetail |
| TC-ORD-02 | `POST /api/orders` | không | như TC-ORD-01 | 401 |
| TC-ORD-03 | `POST /api/orders` | khách | `qty` lớn hơn tồn kho | 409 "Insufficient stock"; GET sản phẩm thấy tồn kho không đổi |
| TC-ORD-04 | `PUT /api/customers/{uid}` với `{"mid":4}`, GET khách, rồi `POST /api/orders` 2 sản phẩm giá 100 | ADMIN cho bước PUT, khách cho phần còn lại | – | score 1000, `discount` 20, `total_amount` 180 |
| TC-ORD-05 | `POST /api/orders` rồi xem event bằng CLI (bên dưới) | khách | như TC-ORD-01 | event `OrderCreated` có đúng `oid` |
| TC-SHP-01 | `POST /api/orders`, đợi 3 giây, `GET /api/orders/{oid}`, `GET /api/shipments/{shipid}` | khách | – | Shipment `PENDING` |
| TC-SHP-02 | CLI (bên dưới) | – | event thiếu `oid` | log bỏ qua; số Shipment không đổi |
| TC-SHP-03 | `PATCH /api/shipments/{shipid}/status` rồi GET lại | STAFF | `{"status":"SHIPPING"}` | 200; GET thấy `SHIPPING` |
| TC-SHP-04 | `PATCH /api/shipments/999999999/status` | STAFF | `{"status":"SHIPPING"}` | 404 |
| TC-SHP-05 | CLI (bên dưới) | – | cùng một event gửi 2 lần | chỉ có 1 Shipment |

Về TC-ORD-04: đề không cho công thức giảm giá, nên hệ thống dùng giả định 1% cho mỗi 100 điểm. Hạng `mid` 1 đến 4 là BRONZE 0, SILVER 100, GOLD 500, PLATINUM 1000 điểm. Giả định nằm ở một file duy nhất là `order-service/src/domain/pricing.js`.

### Lệnh CLI cho 3 test case cần Kafka

Postman không gửi được event Kafka, nên 3 case này dùng PowerShell. Thay `<MONGO_ROOT_PASSWORD>` bằng mật khẩu trong `.env`, thay `<oid>` bằng `oid` vừa đặt.

**TC-ORD-05: xem event trên Kafka**

```powershell
docker compose exec kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic order-created --from-beginning --timeout-ms 8000 | Select-String '"oid":<oid>'
```

**TC-SHP-02: event thiếu oid**

```powershell
# 1. Đếm Shipment trước
docker compose exec shipment-db mongosh -u root -p <MONGO_ROOT_PASSWORD> --authenticationDatabase admin shipment_db --quiet --eval "db.shipments.countDocuments({})"
# 2. Gửi event thiếu oid
'{"eventId":"demo-02","uid":1}' | docker compose exec -T kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic order-created
# 3. Xem log: phải có 'Skipped invalid OrderCreated event: event is missing a valid oid'
docker compose logs shipment-service --tail 5
# 4. Đếm lại: số không đổi
docker compose exec shipment-db mongosh -u root -p <MONGO_ROOT_PASSWORD> --authenticationDatabase admin shipment_db --quiet --eval "db.shipments.countDocuments({})"
```

**TC-SHP-05: cùng event hai lần**

```powershell
# 1. Gửi cùng một event 2 lần (oid giả 900000001)
$e = '{"eventId":"demo-05","oid":900000001,"uid":1}'
"$e`n$e" | docker compose exec -T kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic order-created
# 2. Đếm Shipment của oid đó: mong đợi 1
docker compose exec shipment-db mongosh -u root -p <MONGO_ROOT_PASSWORD> --authenticationDatabase admin shipment_db --quiet --eval "db.shipments.countDocuments({oid:900000001})"
# 3. Log phải có 'Duplicate OrderCreated for order 900000001 ignored'
docker compose logs shipment-service --tail 5
```

Sau khi gửi event, đợi 2 đến 3 giây rồi mới đếm hoặc xem log, vì Shipment Service xử lý bất đồng bộ.

## Xử lý sự cố

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| 429 khi đăng ký hoặc đăng nhập | Quá 10 lần mỗi phút | Đợi 1 phút rồi gửi lại |
| 401 dù đã gắn token | Token hết hạn sau 1 giờ, hoặc dán thiếu | Đăng nhập lại, dán `accessToken` mới vào Bearer Token |
| 403 | Dùng sai vai trò: tạo sản phẩm cần ADMIN, đổi trạng thái Shipment cần STAFF, đặt hàng cần khách | Đổi sang token đúng vai trò |
| 404 khi xem hồ sơ khách hoặc đặt hàng ngay sau khi đăng ký | Hồ sơ Customer được tạo bất đồng bộ qua Kafka, chưa kịp | Đợi 3 đến 5 giây rồi gửi lại |
| `shipment` là `null` khi xem đơn | Shipment đang được tạo qua Kafka | Đợi 3 giây rồi gửi lại `GET /api/orders/{oid}` |
| 400 khi tạo hoặc sửa sản phẩm | Thiếu một trong `pname`, `price`, `quantity` | Gửi đủ cả ba trường (PUT thay toàn bộ) |
| Lệnh Kafka báo topic hoặc group không tồn tại | Chưa có đăng ký hoặc đơn hàng nào nên chưa có event | Đặt một đơn bằng Postman rồi chạy lại |
| `mongosh` báo lỗi xác thực | Sai `MONGO_ROOT_PASSWORD` | Lấy đúng mật khẩu trong `.env` |
| Container không healthy | Service chưa kịp lên hoặc bị lỗi | `docker compose logs <service> --tail 30`; đợi thêm 30 giây rồi `docker compose ps` lại |
| Cổng 3000 bị chiếm khi `up` | Container cũ còn đang chạy cổng 3000 | `docker ps` để tìm và tắt container đó |
