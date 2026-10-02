const { DomainError } = require("../../domain/errors");

// Bộ xử lý một tin nhắn Kafka UserRegistered (adapter đầu vào, tương tự gRPC handler).
//  - Tin nhắn hỏng (không phải JSON, thiếu uid/username): ghi log rồi BỎ QUA, không chặn hàng đợi.
//  - Lỗi hạ tầng (vd DB tắt): ném lỗi để kafkajs thử lại; KHÔNG bỏ qua sự kiện hợp lệ.
const createUserRegisteredHandler = ({ provisionCustomer, logger = console }) => async (message) => {
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
        const { uid, created } = await provisionCustomer.execute(event);
        logger.log(created ? `Customer ${uid} created from UserRegistered` : `Duplicate UserRegistered for uid ${uid} ignored`);
    } catch (error) {
        if (error instanceof DomainError) {
            logger.warn(`Skipped invalid UserRegistered event: ${error.message}`);
            return;
        }
        throw error;
    }
};

module.exports = { createUserRegisteredHandler };