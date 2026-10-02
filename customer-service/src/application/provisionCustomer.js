const { invalidArgument } = require("../domain/errors");
const { validateUid } = require("../domain/validation");

// Use case: tạo Customer mặc định khi Auth phát sự kiện UserRegistered.
// IDEMPOTENT: nhận cùng một sự kiện nhiều lần vẫn chỉ có một Customer và không ghi đè dữ liệu đã sửa.
class ProvisionCustomer {
    constructor({ customerRepository }) {
        this.customerRepository = customerRepository;
    }

    async execute(event) {
        if (event === null || typeof event !== "object") throw invalidArgument("event must be an object");
        const uid = validateUid(event.uid);
        const username = typeof event.username === "string" ? event.username.trim() : "";
        if (username === "") throw invalidArgument("username is required");

        // fullname mặc định = username; hạng thành viên mặc định = mid 1 (giá trị DEFAULT của cột).
        const created = await this.customerRepository.createIfAbsent({ uid, fullname: username.slice(0, 100) });
        return { uid, created };
    }
}

module.exports = { ProvisionCustomer };