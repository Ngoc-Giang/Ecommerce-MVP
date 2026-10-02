const { validateStockItems } = require("../domain/validation");

// Hoàn tồn kho khi bước sau của Order thất bại. Sản phẩm đã bị xoá thì bỏ qua.
// Lưu ý: KHÔNG idempotent - Order Service phải gọi đúng một lần cho mỗi lần ReserveStock đã thành công.
class ReleaseStock {
    constructor({ productRepository }) {
        this.productRepository = productRepository;
    }

    async execute({ items }) {
        for (const { pid, qty } of validateStockItems(items)) {
            await this.productRepository.release(pid, qty);
        }
        return {};
    }
}

module.exports = { ReleaseStock };