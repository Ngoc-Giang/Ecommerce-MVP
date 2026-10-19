// Dữ liệu mẫu cho product_db. Mongo chỉ chạy tệp này khi volume product-db-data còn trống
// (lần khởi tạo đầu tiên, hoặc sau `docker compose down -v`).
// Cấu trúc khớp services/product-service/src/infrastructure/mongoProductRepository.js:
// products { _id: pid (số nguyên), pname, price, quantity, createdAt, updatedAt }, counters { _id: "products", seq }.
const productDb = db.getSiblingDB("product_db");
const now = new Date();

productDb.products.insertMany([
    { _id: 1, pname: "Laptop", price: 1500, quantity: 10 },
    { _id: 2, pname: "Điện thoại", price: 800, quantity: 20 },
    { _id: 3, pname: "Tai nghe", price: 100, quantity: 50 },
].map((p) => ({ ...p, createdAt: now, updatedAt: now })));

// Đặt bộ đếm bằng pid lớn nhất để sản phẩm tạo qua API nhận pid 4 trở đi, không trùng.
productDb.counters.updateOne({ _id: "products" }, { $set: { seq: 3 } }, { upsert: true });
