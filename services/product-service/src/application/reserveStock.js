const { notFound, insufficientStock } = require("../domain/errors");
const { validateStockItems } = require("../domain/validation");

// UC06 bước 6-7 / UC08: kiểm tra tồn kho và trừ kho. ĐƯỢC CẢ LÔ HOẶC KHÔNG ĐƯỢC GÌ.
// MongoDB đơn lẻ không có transaction đa tài liệu, nên: trừ từng sản phẩm bằng thao tác nguyên tử
// có điều kiện (quantity >= qty); nếu một sản phẩm thất bại thì hoàn lại những sản phẩm đã trừ.
class ReserveStock {
    constructor({ productRepository, logger = console }) {
        this.productRepository = productRepository;
        this.logger = logger;
    }

    async execute({ items }) {
        const wanted = validateStockItems(items);
        const reserved = [];
        try {
            for (const { pid, qty } of wanted) {
                const before = await this.productRepository.reserve(pid, qty);
                if (!before) {
                    const exists = await this.productRepository.findByPid(pid);
                    throw exists
                        ? insufficientStock(`Insufficient stock for product ${pid}`)
                        : notFound(`Product ${pid} not found`);
                }
                reserved.push({ pid, qty, unitPrice: before.price });
            }
        } catch (error) {
            await this.rollback(reserved);
            throw error;
        }
        return { items: reserved };
    }

    async rollback(reserved) {
        for (const { pid, qty } of reserved) {
            try {
                await this.productRepository.release(pid, qty);
            } catch (error) {
                // Không thể làm gì thêm ở đây: ghi log để người vận hành đối soát.
                this.logger.error(`ROLLBACK FAILED: could not restore ${qty} of product ${pid}: ${error.message}`);
            }
        }
    }
}

module.exports = { ReserveStock };