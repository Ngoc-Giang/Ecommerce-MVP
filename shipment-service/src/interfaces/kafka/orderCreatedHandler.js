const { DomainError } = require("../../domain/errors");

// Bộ xử lý một tin nhắn Kafka OrderCreated (adapter đầu vào, tương tự gRPC handler).
//  - Tin nhắn hỏng (không phải JSON, thiếu oid/uid): GHI NHẬN LỖI (log) rồi bỏ qua, không tạo Shipment, không chặn hàng đợi (TC-SHP-02).
//  - Lỗi hạ tầng (vd MongoDB tắt): ném lỗi để kafkajs thử lại; KHÔNG bỏ qua sự kiện hợp lệ.
const createOrderCreatedHandler = ({ createShipmentFromOrder, logger = console }) => async (message) => {
    if (!message.value) {
        logger.warn("Skipped empty Kafka message");
        return;
    }
    let event;
    try {
        event = JSON.parse(message.value.toString());
    } catch {
        logger.warn("Skipped Kafka message: invalid JSON");
        return;
    }
    try {
        const { shipment, created } = await createShipmentFromOrder.execute(event);
        logger.log(
            created
                ? `Shipment ${shipment.shipid} created for order ${shipment.oid}`
                : `Duplicate OrderCreated for order ${shipment.oid} ignored (shipment ${shipment.shipid})`
        );
    } catch (error) {
        if (error instanceof DomainError) {
            logger.warn(`Skipped invalid OrderCreated event: ${error.message}`);
            return;
        }
        throw error;
    }
};

module.exports = { createOrderCreatedHandler };