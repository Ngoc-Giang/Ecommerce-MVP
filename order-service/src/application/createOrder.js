const { validateUid, validateItems } = require("../domain/validation");
const { invalidArgument, DomainError } = require("../domain/errors");
const { MAX_CENTS, calculateTotals, fromCents } = require("../domain/pricing");
const { orderCreated } = require("../domain/events");

// UC06 + UC07 + UC08 + UC09. Thứ tự các bước theo sơ đồ luồng:
//   lấy Customer + điểm -> (tính giảm giá) -> Product kiểm tra giá/tồn kho và trừ kho -> lưu Order/OrderDetail/Outbox trong 1 transaction.
class CreateOrder {
    constructor({ orderRepository, customerGateway, productGateway, logger = console }) {
        Object.assign(this, { orderRepository, customerGateway, productGateway, logger });
    }

    async execute({ uid, items }) {
        validateUid(uid);
        validateItems(items);
        const requested = items.map(({ pid, qty }) => ({ pid, qty }));

        // Bước 1: chưa đụng tới kho. Customer không có / Customer Service lỗi => thất bại an toàn, không có gì cần hoàn.
        const customer = await this.customerGateway.getCustomer(uid);
        const score = customer.membership && customer.membership.score;
        if (!Number.isInteger(score)) throw new DomainError("UNAVAILABLE", "Membership data unavailable");

        // Bước 2: Product kiểm tra tồn kho và trừ kho (được cả lô hoặc không được gì), trả về giá tại thời điểm đặt.
        const reserved = await this.productGateway.reserveStock(requested);

        // Từ đây kho ĐÃ bị trừ: bất kỳ lỗi nào cũng phải hoàn kho lại (bù trừ).
        try {
            const { subtotalCents, discountCents, totalCents } = calculateTotals(reserved, score);
            if (subtotalCents > MAX_CENTS) throw invalidArgument("Order total is too large");

            const discount = fromCents(discountCents);
            const lines = reserved.map(({ pid, qty, unitPrice }) => ({ pid, qty, unitPrice }));
            const oid = await this.orderRepository.create({ uid, discount, items: lines }, (id) =>
                orderCreated({ oid: id, uid })
            );
            return { oid, uid, discount, totalAmount: fromCents(totalCents), items: lines };
        } catch (error) {
            await this.compensate(requested, error);
            throw error;
        }
    }

    async compensate(items, cause) {
        try {
            await this.productGateway.releaseStock(items);
        } catch (releaseError) {
            // Không được nuốt im lặng: đây là chỗ kho có thể bị hụt, cần người xử lý.
            this.logger.error(
                `RELEASE FAILED after "${cause.message}": ${releaseError.message}; items=${JSON.stringify(items)}`
            );
        }
    }
}

module.exports = { CreateOrder };