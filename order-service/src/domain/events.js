const { randomUUID } = require("crypto");

// Sự kiện OrderCreated (sơ đồ: { oid, uid, ... }). Chỉ chứa thứ Shipment cần để tạo và kiểm tra quyền truy cập.
const orderCreated = ({ oid, uid }) => ({
    type: "OrderCreated",
    payload: {
        eventId: randomUUID(), // để consumer chống xử lý trùng
        oid,
        uid,
        occurredAt: new Date().toISOString()
    }
});

module.exports = { orderCreated };