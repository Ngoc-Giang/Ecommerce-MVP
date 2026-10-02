const { randomUUID } = require("crypto");

// Sự kiện miền: chỉ chứa thông tin service khác THỰC SỰ cần (không có email, phone, mật khẩu).
const userRegistered = ({ uid, username }) => ({
    type: "UserRegistered",
    payload: {
        eventId: randomUUID(), // để consumer chống xử lý trùng
        uid,
        username,
        occurredAt: new Date().toISOString()
    }
});

module.exports = { userRegistered };